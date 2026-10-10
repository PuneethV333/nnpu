/**
 * One place to turn a thrown axios/zod/Error value into text an admin can act
 * on. NestJS validation failures arrive as `message: string[]`, so a plain
 * `err.response.data.message` rendered in an Alert prints "[object Object]"
 * or a comma-run for those.
 */
export const errorMessage = (
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string => {
  const message = (err as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;

  if (Array.isArray(message)) return message.join('\n');
  if (typeof message === 'string' && message) return message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
};
