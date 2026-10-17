/**
 * Display helpers for the class/stream data every section payload carries.
 *
 * `Class.name` is stored as "1" or "2" (1st / 2nd PUC), and the stream is not
 * a column at all — it is encoded in `Section.session` as the "SCI-"/"COM-"
 * prefix the backend's `sectionSessionKey` writes. Both need one definition so
 * the Overview, the pickers and the chips cannot drift and label the same
 * section two different ways.
 */

const STREAM_LABEL: Record<string, string> = {
  SCI: 'Science',
  COM: 'Commerce',
};

/** Order the streams are listed in; anything unknown sorts after these. */
const STREAM_ORDER = ['Science', 'Commerce'];

/** "SCI-A" -> "Science". A session with no known prefix reads "General". */
export const sectionStreamLabel = (session: string): string => {
  const prefix = session.split('-')[0]?.toUpperCase() ?? '';
  return STREAM_LABEL[prefix] ?? 'General';
};

/** Keeps Science before Commerce, then anything else alphabetically. */
export const compareStreams = (a: string, b: string): number => {
  const ai = STREAM_ORDER.indexOf(a);
  const bi = STREAM_ORDER.indexOf(b);
  const rank = (i: number) => (i === -1 ? STREAM_ORDER.length : i);
  return rank(ai) - rank(bi) || a.localeCompare(b);
};

/** "1" -> "1st", "2" -> "2nd", "3" -> "3rd", "11" -> "11th". */
const ordinal = (value: string): string => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return value;

  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
};

/**
 * "1" -> "1st PU", "2" -> "2nd PU".
 *
 * The school's classes are PUC years, so "Class 1" is wrong in user-facing
 * copy. A value that already carries "PU" passes through unchanged, so this is
 * safe to call on data a future seed might store pre-formatted.
 */
export const sectionPuLabel = (className: string): string =>
  /PU/i.test(className) ? className : `${ordinal(className)} PU`;

/**
 * Sort order for PU years, numeric so "1" precedes "2" (and "10" would precede
 * "9" if the school ever grows past PUC).
 */
export const comparePuYears = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true });
