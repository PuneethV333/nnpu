import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { EnterMarksDto } from './dto/enter-marks.dto';

@Injectable()
export class MarksService {
  constructor(
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveUser(
    authId: string,
  ): Promise<{ userId: string; role: string }> {
    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      select: { userId: true, user: { select: { role: true } } },
    });

    if (!auth) {
      throw new UnauthorizedException('user not found');
    }

    return { userId: auth.userId, role: auth.user.role };
  }

  private async assertAssignedTeacher(
    sectionId: string,
    subjectId: string,
    userId: string,
    role: string,
  ): Promise<void> {
    if (role === 'Admin') return;

    const sectionSubject = await this.prisma.sectionSubject.findUnique({
      where: { sectionId_subjectId: { sectionId, subjectId } },
    });

    if (!sectionSubject || sectionSubject.teacherId !== userId) {
      throw new ForbiddenException(
        'You are not the assigned teacher for this subject',
      );
    }
  }

  async createAssessment(dto: CreateAssessmentDto, authId: string) {
    this.logger.log('[create-assessment]');
    const { userId, role } = await this.resolveUser(authId);

    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });

    if (!subject) {
      throw new BadRequestException('Subject not found');
    }

    if (dto.category === 'FinalPractical' && !subject.hasPractical) {
      throw new BadRequestException(
        `${subject.name} does not have a practical component`,
      );
    }

    await this.assertAssignedTeacher(
      dto.sectionId,
      dto.subjectId,
      userId,
      role,
    );

    return this.prisma.assessment.create({
      data: {
        name: dto.name,
        category: dto.category,
        subjectId: dto.subjectId,
        sectionId: dto.sectionId,
        maxMarks: dto.maxMarks,
        date: dto.date ? new Date(dto.date) : null,
      },
    });
  }

  async listAssessments(sectionId: string, subjectId?: string) {
    this.logger.log('[list-assessments]');
    return this.prisma.assessment.findMany({
      where: { sectionId, ...(subjectId ? { subjectId } : {}) },
      orderBy: { createdAt: 'asc' },
    });
  }

  async enterMarks(dto: EnterMarksDto, authId: string) {
    this.logger.log('[enter-marks]');
    const { userId, role } = await this.resolveUser(authId);

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: dto.assessmentId },
    });

    if (!assessment) {
      throw new BadRequestException('Assessment not found');
    }

    await this.assertAssignedTeacher(
      assessment.sectionId,
      assessment.subjectId,
      userId,
      role,
    );

    const overMax = dto.entries.find(
      (e) => e.marksObtained > assessment.maxMarks,
    );

    if (overMax) {
      throw new BadRequestException(
        `Marks for student ${overMax.studentId} exceed max marks (${assessment.maxMarks})`,
      );
    }

    await this.prisma.$transaction(
      dto.entries.map((entry) =>
        this.prisma.mark.upsert({
          where: {
            studentId_assessmentId: {
              studentId: entry.studentId,
              assessmentId: dto.assessmentId,
            },
          },
          update: {
            marksObtained: entry.marksObtained,
            remarks: entry.remarks,
            enteredById: userId,
          },
          create: {
            studentId: entry.studentId,
            assessmentId: dto.assessmentId,
            marksObtained: entry.marksObtained,
            remarks: entry.remarks,
            enteredById: userId,
          },
        }),
      ),
    );

    return { message: `Marks entered for ${dto.entries.length} students` };
  }

  async getMyMarks(authId: string, subjectId?: string) {
    this.logger.log('[my-marks]');
    const { userId: studentId } = await this.resolveUser(authId);

    return this.prisma.mark.findMany({
      where: {
        studentId,
        ...(subjectId ? { assessment: { subjectId } } : {}),
      },
      include: { assessment: { include: { subject: true } } },
      orderBy: { assessment: { createdAt: 'desc' } },
    });
  }

  async getFinalReport(studentId: string, subjectId: string, authId: string) {
    this.logger.log('[final-report]');
    const { userId, role } = await this.resolveUser(authId);

    const isSelf = role === 'Student' && userId === studentId;
    const isStaff = role === 'Teacher' || role === 'Admin';

    if (!isSelf && !isStaff) {
      throw new ForbiddenException('You are not allowed to view this report');
    }

    const marks = await this.prisma.mark.findMany({
      where: {
        studentId,
        assessment: {
          subjectId,
          category: { in: ['FinalTheory', 'FinalPractical', 'Internal'] },
        },
      },
      include: { assessment: true },
    });

    const total = marks.reduce((sum, m) => sum + m.marksObtained, 0);
    const maxTotal = marks.reduce((sum, m) => sum + m.assessment.maxMarks, 0);
    const percentage =
      maxTotal > 0 ? Number(((total / maxTotal) * 100).toFixed(2)) : 0;

    return {
      studentId,
      subjectId,
      total,
      maxTotal,
      percentage,
      breakdown: marks,
    };
  }
}
