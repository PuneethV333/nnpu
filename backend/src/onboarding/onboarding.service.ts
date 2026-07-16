import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';

import {
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
import { Prisma } from '@/generated/prisma/client';
import { SecondLanguage } from '@/generated/prisma/enums';

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

    const today = new Date();
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

    const section = await tx.section.findUnique({
      where: {
        classId_session_academicYearId: {
          classId: classRecord.id,
          session: dto.session,
          academicYearId: academicYear.id,
        },
      },
      include: { class: true, academicYear: true },
    });

    if (!section) {
      throw new NotFoundException(
        `No section exists for class ${dto.classYear}, session ${dto.session}, academic year ${academicYear.label}`,
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
      const joinYear2 = section.academicYear.startDate
        .getFullYear()
        .toString()
        .slice(-2);
      const langCode = LANG_CODE[dto.language as SecondLanguage];
      const sessionCode = section.session;

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

  // Creates a single Section ("session") — now a purely physical/roll
  // grouping. Combination and language live on the student (User), so one
  // Section can freely mix PCMB, PCMC, different languages, etc.
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

    try {
      return await this.prisma.section.create({
        data: {
          name: `${classRecord.name}-${dto.session}`,
          classId: classRecord.id,
          session: dto.session,
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
}
