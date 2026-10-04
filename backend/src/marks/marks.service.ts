import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { EnterMarksDto } from './dto/enter-marks.dto';
import {
  assertNoDuplicateStudents,
  assertStudentsInSection,
} from '@/common/utils/section-students.util';
import { SubjectResultDto, SubjectResultSchema } from './types/reportCard.type';

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

  /**
   * Section-level counterpart to `assertAssignedTeacher`, for endpoints where the
   * subject is optional. Without it, omitting `subjectId` skipped authorization
   * entirely and returned every assessment in the section to any logged-in user.
   */
  private async assertAssignedToSection(
    sectionId: string,
    userId: string,
    role: string,
  ): Promise<void> {
    if (role === 'Admin') return;

    const assignment = await this.prisma.sectionSubject.findFirst({
      where: { sectionId, teacherId: userId },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this section');
    }
  }

  async createAssessment(dto: CreateAssessmentDto, authId: string) {
    this.logger.log('[create-assessment]');
    const { userId, role } = await this.resolveUser(authId);

    await this.assertAssignedTeacher(
      dto.sectionId,
      dto.subjectId,
      userId,
      role,
    );

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

  async listAssessments(
    sectionId: string,
    subjectId: string | undefined,
    authId: string,
  ) {
    this.logger.log('[list-assessments]');
    const { userId, role } = await this.resolveUser(authId);

    // With a subjectId we can use the strict subject-level check; without one
    // any assignment in the section is enough to justify seeing its assessments.
    if (subjectId) {
      await this.assertAssignedTeacher(sectionId, subjectId, userId, role);
    } else {
      await this.assertAssignedToSection(sectionId, userId, role);
    }

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

    // The upsert below keys on [studentId, assessmentId], which carries no
    // section at all. Without these two checks the assigned teacher of section
    // A could submit section B's students and have the marks written against
    // their own section's assessment, and a duplicated studentId would be
    // silently overwritten by the later entry instead of erroring.
    assertNoDuplicateStudents(dto.entries.map((e) => e.studentId));

    await assertStudentsInSection(
      this.prisma,
      assessment.sectionId,
      dto.entries.map((e) => e.studentId),
    );

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

    if (!isSelf && role !== 'Admin') {
      if (role !== 'Teacher') {
        throw new ForbiddenException('You are not allowed to view this report');
      }

      // A teacher may only read a report for a student they actually teach, for
      // the subject they teach them. The section comes from the *student's* row,
      // never from caller input, so this cannot be steered elsewhere. Previously
      // `role === 'Teacher'` alone was sufficient, which let any teacher read any
      // student's report for any subject.
      const student = await this.prisma.user.findUnique({
        where: { id: studentId },
        select: { sectionId: true },
      });

      if (!student?.sectionId) {
        throw new NotFoundException('Student not found');
      }

      await this.assertAssignedTeacher(
        student.sectionId,
        subjectId,
        userId,
        role,
      );
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

    const res: SubjectResultDto = {
      studentId,
      subjectId,
      total,
      maxTotal,
      percentage,
      breakdown: marks.map((mark) => ({
        id: mark.id,
        marksObtained: mark.marksObtained,
        remarks: mark.remarks,
        assessment: {
          id: mark.assessment.id,
          name: mark.assessment.name,
          category: mark.assessment.category,
          maxMarks: mark.assessment.maxMarks,
          date: mark.assessment.date,
        },
      })),
    };

    return SubjectResultSchema.parse(res);
  }

  async getPendingAssessments(authId: string) {
    this.logger.log('[pending-assessments]');
    const { userId, role } = await this.resolveUser(authId);

    if (role !== 'Student') {
      throw new ForbiddenException(
        'Only students can view pending assessments',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { sectionId: true },
    });

    if (!user?.sectionId) {
      return [];
    }

    const assessments = await this.prisma.assessment.findMany({
      where: { sectionId: user.sectionId },
      include: { subject: { select: { name: true } } },
    });

    const existing = await this.prisma.mark.findMany({
      where: {
        studentId: userId,
        assessmentId: { in: assessments.map((a) => a.id) },
      },
      select: { assessmentId: true },
    });

    const markedIds = new Set(existing.map((m) => m.assessmentId));

    return assessments
      .filter((a) => !markedIds.has(a.id))
      .map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        subjectName: a.subject.name,
      }));
  }

  async getMySubjects(sectionId: string, authId: string) {
    const { userId, role } = await this.resolveUser(authId);

    const data = await this.prisma.sectionSubject.findMany({
      where: {
        sectionId,
        // Admins can see every subject taught in the section (e.g. for
        // oversight); teachers only see their own assigned subjects.
        ...(role === 'Teacher' ? { teacherId: userId } : {}),
      },
      select: {
        subjectId: true,
        subject: { select: { name: true, hasPractical: true } },
      },
    });

    const result = data.map((x) => ({
      name: x.subject.name,
      hasPractical: x.subject.hasPractical,
      id: x.subjectId,
    }));

    return result;
  }
}
