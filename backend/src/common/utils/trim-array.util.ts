/**
 * Trim the strings inside an array, leaving anything that is not one alone.
 *
 * `IsBoundedId` trims a scalar id, but it is built from the plain (non-`each`)
 * class-validator decorators, so it can neither validate nor transform the
 * elements of an array. This is the array counterpart, for the same reason the
 * scalar one exists: a padded id would reach Prisma and simply not match, which
 * surfaces as a confusing 404 rather than a validation error.
 *
 * Declared to return `unknown` on purpose — `Array.isArray` narrows its argument
 * to `any[]`, and returning that trips `@typescript-eslint/no-unsafe-return`.
 */
export const trimEach = (value: unknown): unknown => {
  if (!Array.isArray(value)) return value;
  return (value as unknown[]).map((v) =>
    typeof v === 'string' ? v.trim() : v,
  );
};
