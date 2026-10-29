/**
 * Timeouts for the calls whose work legitimately outlasts the default 15s.
 *
 * The global client timeout is 15s, which is right for a read or a single-row
 * write. Three calls here are batches: they hold the response open while the
 * server does work proportional to a cohort, and abandoning them mid-flight does
 * not cancel that work — it only hides the result. The user then retries an
 * operation that already committed, or reports a failure for something that
 * succeeded.
 *
 * Each constant sits above the bound the server itself enforces, because a
 * client timeout below the server's ceiling reintroduces the false failure it
 * was added to remove. Keep them in step when either side changes.
 */

/** One message, server-capped at about two minutes (60 + 30 + 60s). */
export const MAIL_REQUEST_TIMEOUT_MS = 160_000;

/**
 * A cohort batch has a 5-minute budget, and the send running when it expires is
 * still allowed its own two minutes, so the hard ceiling is ~7 minutes. That tail
 * only matters when a mail host dies mid-batch.
 */
export const BULK_MAIL_REQUEST_TIMEOUT_MS = 460_000;

/**
 * Invoice generation writes one row per active student in the section, in one
 * request. A section runs to a hundred students, and on a cold connection pool
 * that is the same failure the CSV import hit: correct server-side work that
 * outlasts the client. Five minutes, the same budget as a mail batch — a
 * generate that takes longer than that is stuck, not slow.
 */
export const INVOICE_GENERATION_TIMEOUT_MS = 300_000;

/**
 * A profile picture going up to Cloudinary, not to our server.
 *
 * Not server work this time but bytes on the wire: a phone photo is a couple of
 * megabytes and the upload happens over whatever connection the school has.
 * `expo-image-picker` is asked for a resized, re-compressed copy before this
 * runs, so a minute is generous — but 15s is a real failure on a slow upload,
 * and a timeout here leaves the image uploaded and the profile unchanged.
 */
export const IMAGE_UPLOAD_TIMEOUT_MS = 60_000;
