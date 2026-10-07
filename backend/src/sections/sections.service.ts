import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@/generated/prisma';
import { SectionArray } from './types/section.type';
import type { AssignSubjectsDto, SetClassTeacherDto } from './dto';

@Injectable()
export class SectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async getMySections(authId: string): Promise<SectionArray> {
    this.logger.log('[sections-mine]');

    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      select: { userId: true },
    });

    if (!auth) {
      throw new UnauthorizedException('User not found');
    }

    const cacheKey = `sections:teacher:${auth.userId}`;
    const cached = await this.redis.get<SectionArray>(cacheKey);
    if (cached) return cached;

    const sections = await this.prisma.section.findMany({
      where: {
        OR: [
          { classTeacherId: auth.userId },
          { subjects: { some: { teacherId: auth.userId } } },
        ],
      },
      include: { class: true, academicYear: true },
      orderBy: [{ class: { name: 'asc' } }, { name: 'asc' }],
    });

    const result: SectionArray = sections.map((s) => ({
      id: s.id,
      name: s.name,
      session: s.session,
      className: s.class.name,
      academicYearLabel: s.academicYear.label,
      academicYearStart: s.academicYear.startDate.getFullYear(),
      isClassTeacher: s.classTeacherId === auth.userId,
    }));

    await this.redis.set<SectionArray>(cacheKey, result, 300);

    return result;
  }

  async getAllSections(): Promise<SectionArray> {
    this.logger.log('[sections-all]');

    const cacheKey = 'sections:all';
    const cached = await this.redis.get<SectionArray>(cacheKey);
    if (cached) return cached;

    const sections = await this.prisma.section.findMany({
      include: { class: true, academicYear: true },
      orderBy: [
        { academicYear: { startDate: 'desc' } },
        { class: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    const result: SectionArray = sections.map((s) => ({
      id: s.id,
      name: s.name,
      session: s.session,
      className: s.class.name,
      academicYearLabel: s.academicYear.label,
      academicYearStart: s.academicYear.startDate.getFullYear(),
      isClassTeacher: false,
    }));

    await this.redis.set<SectionArray>(cacheKey, result, 300);

    return result;
  }

  /**
   * Verifies the ids exist and are usable as staff.
   *
   * `role: 'Teacher'` matters: `Section.classTeacherId` and
   * `SectionSubject.teacherId` both point at `User`, and both are used as
   * "who marks attendance here", so a Student or Admin id would silently
   * create an assignment that no attendance path honours.
   */
  private async assertAssignableTeachers(
    teacherIds: (string | null)[],
  ): Promise<void> {
    const ids = [...new Set(teacherIds.filter((id): id is string => !!id))];
    if (ids.length === 0) return;

    const teachers = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, role: true, isActive: true },
    });

    const byId = new Map(teachers.map((t) => [t.id, t]));

    const invalid = ids.filter((id) => byId.get(id)?.role !== 'Teacher');
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Not an existing teacher: ${invalid.join(', ')}`,
      );
    }

    const inactive = ids.filter((id) => byId.get(id)?.isActive !== true);
    if (inactive.length > 0) {
      throw new BadRequestException(
        `Teacher is deactivated and cannot be assigned: ${inactive.join(', ')}`,
      );
    }
  }

  private async assertSectionExists(sectionId: string): Promise<void> {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: { id: true },
    });

    if (!section) {
      throw new NotFoundException(`Section ${sectionId} not found`);
    }
  }

  /**
   * Drops every cache an assignment change can affect.
   *
   * Two keys, not one. `getMySections` caches per teacher for 300s, so an
   * assignment change would otherwise leave a teacher unable to see a section
   * they were just given — or still able to see one they were just removed
   * from. The previous holder is invalidated too, otherwise their list keeps a
   * section they no longer staff.
   *
   * `sections:all` is the one that was missed. `getAllSections` returns the
   * same rows but includes `isClassTeacher`, derived from `classTeacherId` —
   * exactly the field `setClassTeacher` writes. So an admin assigning a class
   * teacher saw the change fail to appear in the section list for five minutes,
   * which reads as "the save did not work" and invites a second identical save.
   */
  private async invalidateTeacherSectionCache(
    ...teacherIds: (string | null | undefined)[]
  ): Promise<void> {
    const ids = teacherIds.filter((id): id is string => typeof id === 'string');

    try {
      await this.redis.delPattern('sections:teacher:*');
      // `sections:all` carries `isClassTeacher`, so it goes stale on the very
      // write this method is called from.
      await this.redis.del('sections:all');

      this.logger.log(
        `[sections-assign] invalidated section caches for ${ids.join(', ') || 'n/a'}`,
      );
    } catch (err) {
      // A stale section list is a UX annoyance, not a correctness problem, and
      // it expires within the TTL. Failing the write would be worse.
      this.logger.warn(
        `[sections-assign] cache invalidation failed: ${String(err)}`,
      );
    }
  }

  async setClassTeacher(sectionId: string, dto: SetClassTeacherDto) {
    this.logger.log('[sections-set-class-teacher]');

    await this.assertSectionExists(sectionId);
    await this.assertAssignableTeachers([dto.teacherId]);

    const previous = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: { classTeacherId: true },
    });

    try {
      const section = await this.prisma.section.update({
        where: { id: sectionId },
        data: { classTeacherId: dto.teacherId },
        select: { id: true, classTeacherId: true },
      });

      await this.invalidateTeacherSectionCache(
        previous?.classTeacherId,
        dto.teacherId,
      );

      return section;
    } catch (err) {
      // `Section.classTeacherId` is @unique: a teacher can only be class
      // teacher of one section, so this is a user error, not a server fault.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'That teacher is already the class teacher of another section',
        );
      }
      throw err;
    }
  }

  async assignSubjects(sectionId: string, dto: AssignSubjectsDto) {
    this.logger.log('[sections-assign-subjects]');

    await this.assertSectionExists(sectionId);

    const subjectIds = dto.assignments.map((a) => a.subjectId);
    const duplicateSubjects = subjectIds.filter(
      (id, i) => subjectIds.indexOf(id) !== i,
    );
    if (duplicateSubjects.length > 0) {
      throw new BadRequestException(
        `Duplicate subject in request: ${[...new Set(duplicateSubjects)].join(', ')}`,
      );
    }

    const subjects = await this.prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      select: { id: true },
    });
    const knownSubjects = new Set(subjects.map((s) => s.id));
    const unknownSubjects = subjectIds.filter((id) => !knownSubjects.has(id));
    if (unknownSubjects.length > 0) {
      throw new BadRequestException(
        `Unknown subject(s): ${unknownSubjects.join(', ')}`,
      );
    }

    await this.assertAssignableTeachers(
      dto.assignments.map((a) => a.teacherId),
    );

    // Capture the outgoing teachers before the upsert, so a reassignment
    // invalidates the cache of whoever used to hold the subject too.
    const existing = await this.prisma.sectionSubject.findMany({
      where: { sectionId, subjectId: { in: subjectIds } },
      select: { subjectId: true, teacherId: true },
    });
    const previousTeachers = existing.map((e) => e.teacherId);

    await this.prisma.$transaction(
      dto.assignments.map((a) =>
        this.prisma.sectionSubject.upsert({
          where: {
            sectionId_subjectId: {
              sectionId,
              subjectId: a.subjectId,
            },
          },
          update: { teacherId: a.teacherId },
          create: {
            sectionId,
            subjectId: a.subjectId,
            teacherId: a.teacherId,
          },
        }),
      ),
    );

    await this.invalidateTeacherSectionCache(
      ...previousTeachers,
      ...dto.assignments.map((a) => a.teacherId),
    );

    return this.getSectionAssignments(sectionId);
  }

  async getSectionAssignments(sectionId: string) {
    this.logger.log('[section-assignments]');

    await this.assertSectionExists(sectionId);

    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: {
        id: true,
        name: true,
        session: true,
        classTeacher: {
          select: { id: true, details: { select: { name: true } } },
        },
        subjects: {
          select: {
            subjectId: true,
            teacherId: true,
            subject: { select: { name: true, hasPractical: true } },
            teacher: {
              select: { id: true, details: { select: { name: true } } },
            },
          },
          orderBy: { subject: { name: 'asc' } },
        },
      },
    });

    if (!section) {
      throw new NotFoundException(`Section ${sectionId} not found`);
    }

    return {
      sectionId: section.id,
      sectionName: section.name,
      session: section.session,
      classTeacher: section.classTeacher
        ? {
            id: section.classTeacher.id,
            name: section.classTeacher.details?.name ?? null,
          }
        : null,
      subjects: section.subjects.map((s) => ({
        subjectId: s.subjectId,
        subjectName: s.subject.name,
        hasPractical: s.subject.hasPractical,
        teacherId: s.teacherId,
        teacherName: s.teacher?.details?.name ?? null,
      })),
    };
  }
}
