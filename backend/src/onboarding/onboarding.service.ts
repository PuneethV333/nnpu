import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import { MailService } from '@/mail/mail.service';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import * as bcrypt from 'bcrypt';
import { COMBO_CODE, LANG_CODE, STREAM_CODE } from './helper/helper';
import { zonedToday } from '@/common/utils/date.util';
import {
  authIdSessionSegment,
  sectionName,
  sectionSessionKey,
} from '@/common/utils/section-session.util';
import { Prisma } from '@/generated/prisma';
import { SecondLanguage } from '@/generated/prisma';
import { CreateSectionsBulkDto } from './dto/create-sections-bulk.dto';
import { DEFAULT_PASSWORD } from '@/common/utils/default-password';

const STAFF_ROLE_CODE: Record<'Teacher' | 'Admin', string> = {
  Teacher: 'T',
  Admin: 'A',
};

/**
 * The parts of staff creation that only a Teacher has.
 *
 * Passed alongside the DTO rather than read off it because `createAdmin` shares
 * this path and its DTO has neither field — an admin account is not a teacher,
 * and writing a subject list for one would be a lie in the database.
 */
interface CreateStaffOptions {
  /** Address to deliver the login details to. No mail is sent when absent. */
  email?: string | null;
  /** Subjects the new teacher teaches. */
  subjectIds?: string[];
}

@Injectable()
export class OnboardingService {
  constructor(
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async createSchool(name: string) {
    this.logger.log('[creating-school]');
    return this.prisma.school.create({
      data: {
        name,
      },
    });
  }

  async resolveSection(tx: Prisma.TransactionClient, dto: CreateStudentDto) {
    const classRecord = await tx.class.findUnique({
      where: { name: dto.classYear },
    });
    if (!classRecord) {
      throw new NotFoundException(`Class "${dto.classYear}" not found`);
    }

    // `zonedToday()`, not `new Date()`: academic years start on a fixed date,
    // so in the hours around local midnight `new Date()` is still the previous
    // calendar day. At 02:00 IST on 1 June it resolves to 31 May and selects the
    // academic year that just ended, putting new students in the wrong year.
    const today = zonedToday();
    const academicYear = await tx.academicYear.findFirst({
      where: {
        startDate: { lte: today },
        endDate: { gte: today },
      },
    });
    if (!academicYear) {
      throw new NotFoundException(
        'No active academic year found for the current date',
      );
    }

    // Looked up by the stream-disambiguated key, matching what enrollment
    // stores. Previously this used the plain label ("A") while enrollment
    // created sections as "SCI-A", so a manually created student never matched
    // an enrollment-created section.
    const sessionKey = sectionSessionKey(dto.stream, dto.session);

    const section = await tx.section.findUnique({
      where: {
        classId_session_academicYearId: {
          classId: classRecord.id,
          session: sessionKey,
          academicYearId: academicYear.id,
        },
      },
      include: { class: true, academicYear: true },
    });

    if (!section) {
      throw new NotFoundException(
        `No section exists for class ${dto.classYear}, stream ${dto.stream}, session ${dto.session} (stored as ${sessionKey}), academic year ${academicYear.label}`,
      );
    }

    return section;
  }

  async createStudent(dto: CreateStudentDto) {
    this.logger.log('[creating-student]');
    return this.prisma.$transaction(async (tx) => {
      const section = await this.resolveSection(tx, dto);

      const combination = await tx.combination.findFirst({
        where: { idCode: dto.subjectCode, stream: dto.stream },
      });
      if (!combination) {
        const existingCombination = await tx.combination.findFirst({
          where: { idCode: dto.subjectCode },
          select: { stream: true },
        });

        if (existingCombination) {
          throw new BadRequestException(
            `Combination "${dto.subjectCode}" is not part of the selected ${dto.stream} stream`,
          );
        }

        throw new NotFoundException(
          `Combination "${dto.subjectCode}" not found`,
        );
      }

      if (combination.stream !== dto.stream) {
        throw new BadRequestException(
          `Combination "${dto.subjectCode}" is not part of the selected ${dto.stream} stream`,
        );
      }

      const puYear = dto.classYear;
      const streamCode = STREAM_CODE[combination.stream];
      const comboCode = COMBO_CODE[combination.idCode];

      // `COMBO_CODE` is a plain `Record<string, string>`, so TypeScript cannot
      // prove the lookup is total the way it can for `STREAM_CODE` /
      // `LANG_CODE` (which are keyed by enums). A Combination row whose idCode is
      // absent from the map yields `undefined`, which used to be interpolated
      // straight into the authId — producing ids like `nnpu1Sundefined26KA001`,
      // and collapsing every unmapped combination into one id-sequence bucket.
      // EnrollmentService.generateAuthId has always guarded this.
      if (!comboCode) {
        throw new BadRequestException(
          `No authId code mapping for combination "${combination.idCode}"`,
        );
      }

      const joinYear2 = section.academicYear.startDate
        .getFullYear()
        .toString()
        .slice(-2);
      const langCode = LANG_CODE[dto.language as SecondLanguage];

      // Derived from the section's own stored session by the shared helper, so
      // the id segment can only ever be the plain label ("A") — never the key
      // ("SCI-A"), and never a multi-character label.
      const sessionCode = authIdSessionSegment(section.session);

      const bucketKey = `nnpu-${puYear}-${streamCode}-${comboCode}-${joinYear2}-${langCode}-${sessionCode}`;

      const seq = await tx.idSequence.upsert({
        where: { id: bucketKey },
        create: { id: bucketKey, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });
      const serial = String(seq.lastValue).padStart(3, '0');
      const authId = `nnpu${puYear}${streamCode}${comboCode}${joinYear2}${langCode}${sessionCode}${serial}`;

      const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

      const user = await tx.user.create({
        data: {
          role: 'Student',
          schoolId: dto.schoolId,
          sectionId: section.id,
          combinationId: combination.id,
          language: dto.language as SecondLanguage,
        },
      });

      await tx.auth.create({
        data: { userId: user.id, authId, password: hashedPassword },
      });

      await tx.personalDetails.create({
        data: {
          userId: user.id,
          name: dto.name,
          profilePic: dto.profilePic ?? '',
          // `null`, not `''`: the column is @unique, and an empty string is a
          // real value, so every manually-created account collided with the
          // previous one (P2002 -> 500). Postgres excludes NULLs from unique
          // indexes.
          email: null,
        },
      });

      return { userId: user.id, authId };
    });
  }

  /**
   * The highest serial already issued for an authId prefix, or 0 for none.
   *
   * `Auth.authId` is fixed-width — `nnpuT26` followed by a zero-padded serial —
   * so a descending sort over the rows carrying the prefix names the highest
   * one. A row whose tail is not numeric cannot be ordered against the others
   * and contributes nothing.
   *
   * This exists because the sequence table is not the only writer of authIds:
   * the seed has written them without touching it, and a database can outlive
   * the code that mis-minted into it.
   */
  private async highestIssuedSerial(
    tx: Prisma.TransactionClient,
    prefix: string,
  ): Promise<number> {
    const highest = await tx.auth.findFirst({
      where: { authId: { startsWith: prefix } },
      orderBy: { authId: 'desc' },
      select: { authId: true },
    });

    if (!highest) return 0;

    const serial = highest.authId.slice(prefix.length);
    return /^\d+$/.test(serial) ? Number(serial) : 0;
  }

  private async createStaffUser(
    role: 'Teacher' | 'Admin',
    dto: CreateTeacherDto | CreateAdminDto,
    options: CreateStaffOptions = {},
  ) {
    this.logger.log(`[creating-${role.toLowerCase()}]`);

    // `|| null`, not `?? null`: the DTO requires a real address, but an empty
    // string must never reach `PersonalDetails.email`. `''` is a *value*, and the
    // unique index treats every one of them as the same address — that is the
    // exact shape of the P2002 that surfaced as a 500 on the second manually
    // created account.
    const email = options.email?.trim() || null;
    const subjectIds = [...new Set(options.subjectIds ?? [])];

    // Pre-checked rather than caught from P2002: the violation fires inside the
    // transaction and names only the index, while a taken email is the one
    // failure here the admin can actually fix. `PersonalDetails.email` is
    // @unique and `null` is how "no email" is stored — `''` would collide, as it
    // did for the second manually created account.
    if (email) {
      const taken = await this.prisma.personalDetails.findFirst({
        where: { email },
        select: { userId: true },
      });
      if (taken) {
        throw new ConflictException(`Email "${email}" is already in use`);
      }
    }

    // Checked before the transaction for the same reason: an unknown id must not
    // burn an idSequence bump, since the sequence is what makes authIds unique.
    if (subjectIds.length > 0) {
      const found = await this.prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true },
      });
      const known = new Set(found.map((s) => s.id));
      const unknown = subjectIds.filter((id) => !known.has(id));
      if (unknown.length > 0) {
        throw new BadRequestException(
          `Unknown subject(s): ${unknown.join(', ')}`,
        );
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const roleCode = STAFF_ROLE_CODE[role];
      const joinYear2 = new Date().getFullYear().toString().slice(-2);
      const bucketKey = `nnpu-staff-${roleCode}-${joinYear2}`;
      const prefix = `nnpu${roleCode}${joinYear2}`;

      const floor = await this.highestIssuedSerial(tx, prefix);

      // The counter is seeded just past the highest authId the table already
      // holds, not at 1: `prisma/dummy.ts` mints staff authIds from its own loop
      // and never wrote the sequence row for them, so on a seeded database this
      // bucket did not exist and the first real create minted `nnpuT26001` again
      // — an existing teacher, and a 500 on `Auth_authId_key`.
      let seq = await tx.idSequence.upsert({
        where: { id: bucketKey },
        create: { id: bucketKey, lastValue: floor + 1 },
        update: { lastValue: { increment: 1 } },
        select: { lastValue: true },
      });

      // A counter that exists but sits behind the table it describes is the same
      // hazard, so it is pushed past the ids actually issued rather than trusted.
      // Only reachable while the bucket is behind; once it leads, the atomic
      // increment above is the whole cost.
      if (seq.lastValue <= floor) {
        seq = await tx.idSequence.update({
          where: { id: bucketKey },
          data: { lastValue: floor + 1 },
          select: { lastValue: true },
        });
      }

      const serial = String(seq.lastValue).padStart(3, '0');
      const authId = `${prefix}${serial}`;

      const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

      const user = await tx.user.create({
        data: {
          role: role,
          schoolId: dto.schoolId,
        },
      });

      await tx.auth.create({
        data: { userId: user.id, authId, password: hashedPassword },
      });

      await tx.personalDetails.create({
        data: {
          userId: user.id,
          name: dto.name,
          profilePic: dto.profilePic ?? '',
          // The address the credentials go to. Nullable-unique, so `null` is the
          // only safe "no address" value.
          email,
        },
      });

      // Inside the transaction with the account, so a teacher can never be
      // created with half their subject list.
      if (subjectIds.length > 0) {
        await tx.teacherSubject.createMany({
          data: subjectIds.map((subjectId) => ({
            teacherId: user.id,
            subjectId,
          })),
        });
      }

      return { userId: user.id, authId };
    });

    if (!email) {
      return { ...created, emailedTo: null, emailSent: false };
    }

    // Sent after the commit, and a failure never rolls the account back: the
    // account exists and a bounced email is a delivery problem to report rather
    // than a reason to discard the work and burn the id. `emailedTo` still names
    // the address that was attempted so the UI can say which one failed.
    try {
      await this.mail.send({
        to: email,
        subject: 'Your NNPU staff portal login details',
        body: [
          `Hi ${dto.name},`,
          '',
          'Your NNPU staff portal account is now active.',
          '',
          `Login ID: ${created.authId}`,
          `Password: ${DEFAULT_PASSWORD}`,
          '',
          'Please change your password after your first login and do not share these details with anyone.',
          '',
          '— NNPU',
        ].join('\n'),
      });
      return { ...created, emailedTo: email, emailSent: true };
    } catch (err) {
      this.logger.error(
        `[creating-${role.toLowerCase()}] mail failed for ${email}: ${String(err)}`,
      );
      return { ...created, emailedTo: email, emailSent: false };
    }
  }

  async createTeacher(dto: CreateTeacherDto) {
    return this.createStaffUser('Teacher', dto, {
      email: dto.email,
      subjectIds: dto.subjectIds,
    });
  }

  async createAdmin(dto: CreateAdminDto) {
    return this.createStaffUser('Admin', dto);
  }

  async createAcademicYear(dto: CreateAcademicYearDto) {
    this.logger.log('[creating-academic-year]');
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new ConflictException('startDate must be before endDate');
    }

    try {
      return await this.prisma.academicYear.create({
        data: { label: dto.label, startDate, endDate },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `Academic year "${dto.label}" already exists`,
        );
      }
      throw err;
    }
  }

  async createSection(dto: CreateSectionDto) {
    this.logger.log('[creating-section]');

    const classRecord = await this.prisma.class.findUnique({
      where: { name: dto.classYear },
    });
    if (!classRecord) {
      throw new NotFoundException(`Class "${dto.classYear}" not found`);
    }

    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });
    if (!academicYear) {
      throw new NotFoundException(
        `Academic year "${dto.academicYearId}" not found`,
      );
    }

    const sessionKey = sectionSessionKey(dto.stream, dto.session);

    try {
      return await this.prisma.section.create({
        data: {
          // Both `name` and `session` are stream-prefixed, matching
          // EnrollmentService, so a section looks the same however it was made.
          name: sectionName(classRecord.name, sessionKey),
          classId: classRecord.id,
          session: sessionKey,
          academicYearId: academicYear.id,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `Section already exists for class ${dto.classYear}, session ${dto.session}, academic year ${academicYear.label}`,
        );
      }
      throw err;
    }
  }

  async createSectionsBulk(dto: CreateSectionsBulkDto) {
    this.logger.log('[creating-sections-bulk]');

    const classRecord = await this.prisma.class.findUnique({
      where: { name: dto.classYear },
    });
    if (!classRecord) {
      throw new NotFoundException(`Class "${dto.classYear}" not found`);
    }

    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });
    if (!academicYear) {
      throw new NotFoundException(
        `Academic year "${dto.academicYearId}" not found`,
      );
    }

    const created: string[] = [];
    const skipped: string[] = [];

    // Sequential, not $transaction — a duplicate session shouldn't roll back
    // the ones that succeeded; each session is independent.
    for (const session of dto.sessions) {
      const sessionKey = sectionSessionKey(dto.stream, session);

      try {
        await this.prisma.section.create({
          data: {
            name: sectionName(classRecord.name, sessionKey),
            classId: classRecord.id,
            session: sessionKey,
            academicYearId: academicYear.id,
          },
        });
        created.push(session);
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          skipped.push(session); // already exists — idempotent re-run
          continue;
        }
        throw err;
      }
    }

    return {
      message: `${created.length} section(s) created, ${skipped.length} already existed`,
      created,
      skipped,
    };
  }
}
