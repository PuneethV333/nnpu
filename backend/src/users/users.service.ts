import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { MailService } from '@/mail/mail.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { hash } from 'bcrypt';
import type { Prisma } from '@/generated/prisma';
import type { PassOutStudentsDto, TransferStudentDto } from './dto';
import { ATTENDANCE_CACHE_PREFIX } from '@/common/utils/cache-keys';

/**
 * Ongoing user lifecycle: deactivation, reactivation, section transfer and
 * admin-initiated password resets.
 *
 * Deliberately separate from `onboarding`, which covers account *creation*.
 * These operations recur for the life of the school and were missing entirely:
 * nothing outside `prisma/dummy.ts` ever set `User.isActive`, moved a student
 * between sections, or reset somebody's password, so a deactivated user stayed
 * deactivated and a transferred student stayed in their old section forever.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
  ) {}

  private async loadUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isActive: true,
        sectionId: true,
        auth: { select: { authId: true } },
        details: { select: { name: true, email: true } },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return user;
  }

  /**
   * Best-effort cache invalidation.
   *
   * A stale cache here is a display problem that self-heals on the next write,
   * so it must never fail the operation that triggered it. `me:{authId}` caches
   * the profile *including the section name*, so a transfer has to clear it or
   * the student keeps seeing their old class.
   */
  private async invalidate(...patterns: string[]): Promise<void> {
    try {
      for (const pattern of patterns) {
        await this.redis.delPattern(pattern);
      }
    } catch (err) {
      this.logger.warn(`[users] cache invalidation failed: ${String(err)}`);
    }
  }

  async setActive(userId: string, active: boolean, actingAuthId: string) {
    this.logger.log(`[users-set-active] ${userId} -> ${active}`);

    const user = await this.loadUser(userId);

    if (user.isActive === active) {
      return {
        userId,
        isActive: user.isActive,
        unchanged: true,
      };
    }

    if (!active) {
      // Self-deactivation would lock the caller out mid-request, and removing
      // the last administrator would leave the school unmanageable.
      if (user.auth?.authId === actingAuthId) {
        throw new BadRequestException('You cannot deactivate your own account');
      }

      if (user.role === 'Admin') {
        const otherAdmins = await this.prisma.user.count({
          where: { role: 'Admin', isActive: true, id: { not: userId } },
        });

        if (otherAdmins === 0) {
          throw new ConflictException(
            'Cannot deactivate the last active admin',
          );
        }
      }
    }

    if (user.auth) {
      // Captured before the closure: TypeScript does not carry the `user.auth`
      // narrowing into a callback, which is why the original code reached for
      // `user.auth!` inside the transaction.
      const { authId } = user.auth;

      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { isActive: active },
        });

        if (!active) {
          await this.revokeSessions(tx, [authId]);
        }
      });
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: active },
      });
    }

    if (user.auth) {
      await this.invalidate(`me:${user.auth.authId}`);
    }

    return { userId, isActive: active, unchanged: false };
  }

  /**
   * Kills live sessions for a set of authIds.
   *
   * Shared with the bulk pass-out so the two paths cannot drift: a bulk
   * deactivation that skipped this would leave every one of those students
   * holding a valid refresh token and a live access token, which is precisely
   * the outcome "deactivated" is supposed to prevent.
   *
   * `jwt-auth.guard` already enforces `isActive`, but outstanding access tokens
   * carry their own expiry, and any refresh token could mint a fresh pair.
   * Bumping tokenVersion covers access tokens; deleting the rows covers
   * refresh.
   */
  private async revokeSessions(
    tx: Prisma.TransactionClient,
    authIds: string[],
  ): Promise<void> {
    if (authIds.length === 0) return;

    await tx.auth.updateMany({
      where: { authId: { in: authIds } },
      data: { tokenVersion: { increment: 1 } },
    });

    await tx.refreshToken.deleteMany({
      where: { authId: { in: authIds } },
    });
  }

  /**
   * Deactivates every active student in the named sections ("pass out").
   *
   * Scoped to `role: 'Student'` deliberately. A section id can also be a
   * teacher's `classTeacherId`, and a class teacher passing out is not what
   * anyone means by passing out a cohort — so a teacher in the section is
   * reported as skipped rather than deactivated.
   *
   * `isActive` is all that is written. The student keeps their `sectionId`, and
   * therefore their attendance and marks history, which is the record of the
   * year they sat. Every roster query already filters `isActive: true`, so they
   * disappear from attendance and marks lists without any of that needing to be
   * detached here.
   *
   * Sessions are revoked through the same `revokeSessions` the single-user
   * deactivate uses. Without it a "deactivated" cohort would keep logging in on
   * live refresh tokens, which would make the whole operation a no-op in
   * practice.
   */
  async passOutStudents(dto: PassOutStudentsDto) {
    const sectionIds = dto.sections.map((s) => s.sectionId);

    this.logger.log(
      `[users-pass-out] sections=${sectionIds.length} dryRun=${dto.dryRun === true} reason="${dto.reason ?? ''}"`,
    );

    const found = await this.prisma.section.findMany({
      where: { id: { in: sectionIds } },
      select: { id: true, name: true, classTeacherId: true },
    });

    // Keyed on what is missing rather than on a length mismatch: passing the
    // same section twice would make the counts differ with nothing missing.
    const foundIds = new Set(found.map((s) => s.id));
    const missing = sectionIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(
        `Section(s) not found: ${missing.join(', ')}`,
      );
    }

    const students = await this.prisma.user.findMany({
      where: { sectionId: { in: sectionIds }, role: 'Student' },
      select: {
        id: true,
        isActive: true,
        sectionId: true,
        auth: { select: { authId: true } },
        details: { select: { name: true } },
      },
    });

    // A class teacher attached to a passed-out section is left alone. Read off
    // `Section.classTeacherId`, since that is where the scalar lives — on User
    // the same link is the `classTeacherOf` relation, not a queryable field.
    const teacherIds = found
      .map((s) => s.classTeacherId)
      .filter((id): id is string => typeof id === 'string');

    const classTeachers = teacherIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: teacherIds }, isActive: true },
          select: { id: true, role: true, details: { select: { name: true } } },
        })
      : [];

    const active = students.filter((s) => s.isActive);
    const alreadyInactive = students.length - active.length;

    const result = {
      dryRun: dto.dryRun === true,
      deactivated: 0,
      alreadyInactive,
      sections: found.map((section) => {
        const inSection = students.filter((s) => s.sectionId === section.id);
        return {
          sectionId: section.id,
          sectionName: section.name,
          passedOut: inSection.filter((s) => s.isActive).length,
        };
      }),
      // Reported, not deactivacted: a teacher in a passing-out cohort is not
      // part of it, and deactivating them would take a member of staff off the
      // portal on a student operation.
      classTeachersUntouched: classTeachers.map((u) => ({
        name: u.details?.name ?? u.id,
        reason: `is the ${u.role} class teacher, so their account is untouched`,
      })),
    };

    if (dto.dryRun) {
      this.logger.log(
        `[users-pass-out] dry run: ${active.length} student(s) would be deactivated`,
      );
      return { ...result, deactivated: 0 };
    }

    if (active.length === 0) {
      return { ...result, deactivated: 0 };
    }

    const ids = active.map((s) => s.id);
    const authIds = active
      .map((s) => s.auth?.authId)
      .filter((a): a is string => typeof a === 'string');

    const deactivated = await this.prisma.$transaction(async (tx) => {
      // `isActive: true` in the where clause as well as in the id list, so a
      // student reactivated by another admin mid-run is not re-deactivated.
      const { count } = await tx.user.updateMany({
        where: { id: { in: ids }, isActive: true },
        data: { isActive: false },
      });

      await this.revokeSessions(tx, authIds);

      return count;
    });

    // One round trip for the whole cohort. `invalidate` would loop
    // `delPattern`, and each of those runs a full keyspace SCAN — 125 students
    // would mean 125 scans. `delMany` DELs exact keys in a single command.
    await this.redis.delMany(authIds.map((authId) => `me:${authId}`));

    // The attendance roster is derived from `User.sectionId` + `isActive` and
    // is otherwise only cleared when attendance is *marked*. Without this, a
    // teacher could open the roster of a cohort that had just been passed out
    // and still mark all of them — the cache would hand back students who no
    // longer have an account.
    await this.redis.delPattern(ATTENDANCE_CACHE_PREFIX);

    this.logger.log(
      `[users-pass-out] deactivated ${deactivated} student(s)${dto.reason ? ` (reason: ${dto.reason})` : ''}`,
    );

    return { ...result, deactivated };
  }

  async transferStudent(studentId: string, dto: TransferStudentDto) {
    this.logger.log('[users-transfer]');

    const student = await this.loadUser(studentId);

    if (student.role !== 'Student') {
      throw new BadRequestException(
        `Only students can be transferred (user is ${student.role})`,
      );
    }

    if (!student.isActive) {
      throw new BadRequestException(
        'Cannot transfer a deactivated student; reactivate them first',
      );
    }

    if (student.sectionId === dto.sectionId) {
      throw new BadRequestException('Student is already in that section');
    }

    const section = await this.prisma.section.findUnique({
      where: { id: dto.sectionId },
      select: { id: true },
    });

    if (!section) {
      throw new NotFoundException(`Section ${dto.sectionId} not found`);
    }

    const fromSectionId = student.sectionId;

    await this.prisma.user.update({
      where: { id: studentId },
      data: { sectionId: dto.sectionId },
    });

    // The cached profile carries the section name, and cached rosters are keyed
    // per section — both are now wrong.
    if (student.auth) {
      await this.invalidate(
        `me:${student.auth.authId}`,
        'attendance:roster:*',
        'sections:teacher:*',
      );
    }

    return {
      studentId,
      fromSectionId,
      toSectionId: dto.sectionId,
      name: student.details?.name ?? null,
    };
  }

  /**
   * Admin password reset.
   *
   * Emails a freshly generated temporary password rather than accepting one from
   * the caller, matching `EnrollmentService.resendCredentials`: the admin never
   * learns the user's credential, and the old password is unrecoverable so a new
   * one is generated instead of reused.
   *
   * Sends the mail BEFORE committing the change. If SMTP fails, nothing has
   * changed and the old password still works. If the write then fails, the
   * emailed password is simply invalid and the old one still works. The other
   * ordering locks the user out with no way back in.
   */
  async resetPassword(userId: string) {
    this.logger.log('[users-reset-password]');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isActive: true,
        auth: { select: { authId: true } },
        details: { select: { name: true, email: true } },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (!user.auth) {
      throw new BadRequestException('User has no auth record to reset');
    }

    const email = user.details?.email;
    if (!email) {
      throw new BadRequestException(
        'User has no email address on file, so a temporary password cannot be delivered',
      );
    }

    const tempPassword = randomBytes(4).toString('hex');
    const name = user.details?.name ?? 'there';

    try {
      await this.mail.send({
        to: email,
        subject: 'Your School Portal password has been reset',
        body: `Hi ${name},\n\nAn administrator reset your password.\n\nAuth ID: ${user.auth.authId}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password. If you did not expect this, contact your school.`,
      });
    } catch (err) {
      this.logger.error(
        `[users-reset-password] mail failed for ${email}: ${String(err)}`,
      );
      throw new ServiceUnavailableException(
        'Could not send the temporary password, so the password was left unchanged. Try again.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.auth.update({
        where: { authId: user.auth!.authId },
        data: {
          password: await hash(tempPassword, 10),
          // Access tokens carry the version; refresh() never compares it, so
          // the rows have to go or an old refresh token mints a new pair.
          tokenVersion: { increment: 1 },
        },
      });

      await tx.refreshToken.deleteMany({
        where: { authId: user.auth!.authId },
      });
    });

    await this.invalidate(`me:${user.auth.authId}`);

    return { userId, authId: user.auth.authId, emailedTo: email };
  }
}
