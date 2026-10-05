import { Stream } from '@/generated/prisma';

/**
 * Internal, stream-disambiguated value for `Section.session`.
 *
 * `Section` has a `@@unique([classId, session, academicYearId])` that does NOT
 * include `stream`. Two streams in the same class therefore cannot both store a
 * session called "A", so the stored value carries a stream prefix ("SCI-A",
 * "COM-A") while students only ever see the plain label ("A").
 *
 * This lived inline in `EnrollmentService` and was not applied by
 * `OnboardingService`, which stored the plain label. The two paths then created
 * *different* sections for the same class and stream: a manually created student
 * looked up session "A" and never matched an enrollment-created "SCI-A".
 *
 * Shared so the mapping has exactly one definition.
 */
export const SECTION_STREAM_PREFIX: Record<Stream, string> = {
  Science: 'SCI',
  Commerce: 'COM',
};

/** "SCI" + "A" -> "SCI-A". The value stored in `Section.session`. */
export const sectionSessionKey = (
  stream: Stream,
  displaySession: string,
): string => `${SECTION_STREAM_PREFIX[stream]}-${displaySession}`;

/**
 * "SCI-A" -> "A". Used for display and for the `session` recorded on a User,
 * which mirrors `EnrollmentService.promoteOne`: the user-facing field holds the
 * plain label, not the internal key.
 */
export const sectionDisplayName = (sessionKey: string): string => {
  const match = /^(?:SCI|COM)-(.*)$/.exec(sessionKey);
  return match ? match[1] : sessionKey;
};
