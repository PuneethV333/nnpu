/**
 * Cache key prefixes, in one place.
 *
 * These existed as string literals scattered across services, which is how
 * `attendance:*` came to be invalidated on exactly one code path (marking
 * attendance) while three others changed the data it describes — a promoted,
 * passed-out or newly-imported student stayed in a cached roster for the full
 * TTL. Centralising them means a writer can name what it invalidates, and a
 * reader can see the whole namespace at once.
 *
 * Wildcards are Redis `MATCH` patterns for `delPattern`, not literal keys.
 */

/**
 * Attendance rosters, per-student history and per-student summaries.
 *
 * Invalidated when attendance is marked AND when the student roster of a
 * section changes. The roster is derived from `User.sectionId` + `isActive`,
 * so anything that moves, adds or deactivates a student invalidates it.
 */
export const ATTENDANCE_CACHE_PREFIX = 'attendance:*';

/** Per-teacher "my sections" lists, keyed by user id. */
export const TEACHER_SECTIONS_CACHE_PREFIX = 'sections:teacher:*';

/**
 * The all-sections list.
 *
 * Separate from the teacher prefix because it also carries `isClassTeacher`,
 * which `setClassTeacher` writes — so an assignment change invalidates it too,
 * not just the per-teacher lists.
 */
export const ALL_SECTIONS_CACHE_KEY = 'sections:all';

/** Calendar day ranges, keyed by from/to dates. */
export const CALENDAR_CACHE_PREFIX = 'range:*';

/**
 * Announcements. Two prefixes, singular and plural, because the keys are
 * `announcement:<page>...`, `announcement:details:<id>...` and
 * `announcements:latest:<audience>` — `announcements:*` does not match
 * `announcement:*`. Both must be cleared on a write.
 */
export const ANNOUNCEMENT_CACHE_PREFIXES = [
  'announcements:*',
  'announcement:*',
] as const;

/** A user's own cached profile. Cleared on transfer, password change, deactivation. */
export const profileCacheKey = (authId: string): string => `me:${authId}`;

/** A revoked access token's jti, until the token would have expired anyway. */
export const blacklistCacheKey = (jti: string): string => `blacklist:${jti}`;
