/**
 * The password every account is minted with, staff and student alike.
 *
 * One constant rather than a literal per call site: onboarding and the CSV
 * import both hash it and both put it in the welcome email, and if two of those
 * ever drifted, half the school would be handed credentials that do not work
 * while the other half worked. It is not a secret — anyone who learns one authId
 * can guess every other account's password — and the email asks recipients to
 * change it, which is the only control there is.
 */
export const DEFAULT_PASSWORD = 'nnpu123';
