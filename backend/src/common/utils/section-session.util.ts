import { Stream } from '@/generated/prisma';
import { BadRequestException } from '@nestjs/common';

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

/**
 * The canonical stored `Section.name`: `"<className>-<sessionKey>"`, e.g.
 * `1-SCI-A`.
 *
 * Every write path used to build this by hand. They drifted:
 * `EnrollmentService.createStreamDrive` took a `classId` parameter but
 * hardcoded the literal `"1"`, so a class-2 section was named `1-SCI-A` while
 * pointing at class 2 — a name that lies about the section it identifies.
 * Taking the class *name* as an argument makes that impossible to express.
 */
export const sectionName = (className: string, sessionKey: string): string =>
  `${className}-${sessionKey}`;

/**
 * The session segment of a student authId.
 *
 * authIds are fixed-width by design:
 *
 *     nnpu{classYear}{stream}{combo}{joinYear2}{lang}{session}{serial:3}
 *     e.g. nnpu1SB26KA001
 *
 * so the segment must be the plain label (`A`), never the stored key (`SCI-A`).
 * Both id-building paths now derive it here from the section's own session
 * value rather than one reading `Section.session` and the other trusting a
 * caller-supplied parameter — which is how the two came to disagree about the
 * width of the segment.
 *
 * Throws on a multi-character label instead of silently producing a longer
 * authId: a wrong-length id is unrecoverable for the user, whereas a rejected
 * session label is fixable by whoever typed it.
 */
export const authIdSessionSegment = (sessionKey: string): string => {
  const label = sectionDisplayName(sessionKey);

  if (label.length !== 1) {
    throw new BadRequestException(
      `Session label "${label}" must be a single character to keep authIds fixed-width (got "${sessionKey}")`,
    );
  }

  return label.toUpperCase();
};
