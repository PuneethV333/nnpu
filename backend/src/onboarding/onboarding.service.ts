import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';

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

const STAFF_ROLE_CODE: Record<'Teacher' | 'Admin', string> = {
  Teacher: 'T',
  Admin: 'A',
};

@Injectable()
export class OnboardingService {
  constructor(
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
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
        where: { idCode: dto.subjectCode },
      });
      if (!combination) {
        throw new NotFoundException(
          `Combination "${dto.subjectCode}" not found`,
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

      const hashedPassword = await bcrypt.hash('nnpu123', 10);

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

  private async createStaffUser(
    role: 'Teacher' | 'Admin',
    dto: CreateTeacherDto | CreateAdminDto,
  ) {
    this.logger.log(`[creating-${role.toLowerCase()}]`);
    return this.prisma.$transaction(async (tx) => {
      const roleCode = STAFF_ROLE_CODE[role];
      const joinYear2 = new Date().getFullYear().toString().slice(-2);
      const bucketKey = `nnpu-staff-${roleCode}-${joinYear2}`;

      const seq = await tx.idSequence.upsert({
        where: { id: bucketKey },
        create: { id: bucketKey, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });
      const serial = String(seq.lastValue).padStart(3, '0');
      const authId = `nnpu${roleCode}${joinYear2}${serial}`;

      const hashedPassword = await bcrypt.hash('nnpu123', 10);

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

  async createTeacher(dto: CreateTeacherDto) {
    return this.createStaffUser('Teacher', dto);
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
