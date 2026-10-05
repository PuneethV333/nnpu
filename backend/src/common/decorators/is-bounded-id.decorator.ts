import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * A route/query identifier: trimmed, non-blank, and length-bounded.
 *
 * Trimmed because `sectionId=%20section-1%20` would otherwise reach a Prisma
 * `where` clause and simply not match, surfacing as a confusing 404/500 rather
 * than a validation error.
 *
 * Blank-rejecting is not the same as `@IsNotEmpty()`, which only rejects
 * `''`/null/undefined — a whitespace-only value passes it. That matters here
 * because a blank `sectionId` is the shape that Prisma drops from a `where`
 * clause entirely (see `assertSectionAccess`), turning a scoped query into an
 * unscoped one.
 *
 * Deliberately not constrained to Prisma's `cuid()` shape: seeded rows use
 * readable ids such as School `seed-school-nnpu`.
 */
export const IsBoundedId = (): PropertyDecorator =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim() : value,
    ),
    IsString(),
    IsNotEmpty(),
    MaxLength(64),
  );
