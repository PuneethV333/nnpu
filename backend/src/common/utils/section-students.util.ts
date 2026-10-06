import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import type { PrismaService } from '@/prisma/prisma.service';

/**
 * The set of student ids that legitimately belong to a section.
 *
 * `Attendance` and `Mark` rows are both scoped to a section and both key on
 * `User.id`, but their write DTOs only carry a bare `studentId`. Without this
 * check, anyone authorised for section A can submit section B's student ids and
 * the row is written against the wrong section — silently corrupting it,
 * because the unique constraints (`[studentId, date]` for Attendance,
 * `[studentId, assessmentId]` for Mark) never see the section at all.
 *
 * Shared by AttendanceService and MarksService so the rule lives in exactly
 * one place.
 */
export const getSectionStudentIds = async (
  prisma: PrismaService,
  sectionId: string,
): Promise<Set<string>> => {
  const students = await prisma.user.findMany({
    where: { sectionId, role: 'Student', isActive: true },
    select: { id: true },
  });

  return new Set(students.map((s) => s.id));
};

/**
 * Throws a BadRequestException if any of `studentIds` is not an active student
 * of `sectionId`, otherwise resolves with the section's full set of active
 * student ids.
 *
 * The set is returned (rather than discarded) so a caller that also needs it —
 * e.g. attendance, which must reject an *incomplete* register — doesn't have to
 * run a second query for data this call already fetched.
 *
 * This is a data-integrity guard, not an authorization guard — it validates the
 * *students* referenced by a submission, while the caller is responsible for
 * separately authorizing the *teacher* against the section.
 */
export const assertStudentsInSection = async (
  prisma: PrismaService,
  sectionId: string,
  studentIds: string[],
): Promise<Set<string>> => {
  const validIds = await getSectionStudentIds(prisma, sectionId);
  const invalidIds = [...new Set(studentIds)].filter((id) => !validIds.has(id));

  if (invalidIds.length > 0) {
    throw new BadRequestException(
      `These students do not belong to section ${sectionId}: ${invalidIds.join(', ')}`,
    );
  }

  return validIds;
};

/**
 * Rejects a submission that lists the same student twice.
 *
 * Both write paths upsert on a `[studentId, ...]` unique key, so a duplicate
 * entry doesn't error — the later value silently wins and the earlier one is
 * discarded.
 */
export const assertNoDuplicateStudents = (studentIds: string[]): void => {
  if (new Set(studentIds).size !== studentIds.length) {
    throw new BadRequestException(
      'Each student may appear only once in a submission',
    );
  }
};

/**
 * Asserts the caller may act on `sectionId`, returning their userId.
 *
 * Admin passes unconditionally. A teacher passes if they are the section's class
 * teacher or teach any of its subjects. Returns the userId so callers can record
 * who did the work without a second lookup.
 *
 * Shared rather than private to `AttendanceService` because several
 * teacher-facing endpoints scope by section — attendance, marks and fees — and
 * `getFeeStructure` was reachable by *any* teacher for *any* section precisely
 * because it had no equivalent check: its service method did not even receive an
 * `authId`.
 *
 * The blank-`sectionId` guard is not paranoia: Prisma DROPS an `undefined` field
 * from a `where` clause instead of matching nothing, so
 * `where: { id: undefined, OR: [...] }` silently degrades to "any section I
 * teach" and the caller's own query then runs with no section filter at all.
 */
export const assertSectionAccess = async (
  prisma: PrismaService,
  sectionId: string,
  authId: string,
): Promise<string> => {
  if (typeof sectionId !== 'string' || sectionId.trim() === '') {
    throw new BadRequestException('sectionId is required');
  }

  const auth = await prisma.auth.findUnique({
    where: { authId },
    select: { userId: true, user: { select: { role: true } } },
  });

  if (!auth) {
    throw new UnauthorizedException('User not found');
  }

  const userId = auth.userId;

  if (auth.user.role === 'Admin') {
    return userId;
  }

  const section = await prisma.section.findFirst({
    where: {
      id: sectionId,
      OR: [
        { classTeacherId: userId },
        { subjects: { some: { teacherId: userId } } },
      ],
    },
    select: { id: true },
  });

  if (!section) {
    throw new ForbiddenException('You are not assigned to teach this section');
  }

  return userId;
};
