import { BadRequestException } from '@nestjs/common';
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
