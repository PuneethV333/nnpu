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
import type { TransferStudentDto } from './dto';

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
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { isActive: active },
        });

        if (!active) {
          // Kill live sessions immediately rather than letting them run out:
          // `jwt-auth.guard` already enforces `isActive`, but outstanding access
          // tokens carry their own expiry, and any refresh token could mint a
          // fresh pair. Bumping tokenVersion covers access tokens; deleting the
          // rows covers refresh.
          await tx.auth.update({
            where: { authId: user.auth!.authId },
            data: { tokenVersion: { increment: 1 } },
          });

          await tx.refreshToken.deleteMany({
            where: { authId: user.auth!.authId },
          });
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
