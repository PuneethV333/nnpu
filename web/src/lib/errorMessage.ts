/**
 * One place to turn a thrown axios/zod/Error value into text a person can act
 * on. Mirrors app/src/libs/errorMessage.ts.
 *
 * NestJS validation failures arrive as `message: string[]`, so rendering
 * `response.data.message` directly prints "[object Object]" for those.
 */
export const errorMessage = (
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string => {
  const message = (err as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;

  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string' && message) return message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
};
