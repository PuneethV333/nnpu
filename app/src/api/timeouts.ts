/**
 * Timeouts for the calls whose server handler sends email before it answers.
 *
 * Those handlers hold the response open for as long as the mail attempt takes,
 * and the server bounds that attempt itself: two minutes for one message, five
 * minutes for a cohort batch. The default 15s client timeout is shorter than
 * either, so the request was abandoned mid-flight — the work committed, the
 * accounts existed, and the app reported a network error. These sit above the
 * server's ceiling so the client always waits for the answer the server is going
 * to give.
 *
 * Keep them in step with `MailService`: a client timeout below the server's bound
 * reintroduces the false failure.
 */

/** One message, server-capped at about two minutes (60 + 30 + 60s). */
export const MAIL_REQUEST_TIMEOUT_MS = 160_000;

/**
 * A cohort batch has a 5-minute budget, and the send running when it expires is
 * still allowed its own two minutes, so the hard ceiling is ~7 minutes. That tail
 * only matters when a mail host dies mid-batch.
 */
export const BULK_MAIL_REQUEST_TIMEOUT_MS = 460_000;
