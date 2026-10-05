import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

/**
 * A single-record identifier taken from a route param.
 *
 * `IsBoundedId` covers the trim/blank/length rules; it deliberately avoids
 * Prisma's `cuid()` shape because seeded rows use readable ids such as School
 * `seed-school-nnpu`.
 */
export class IdParamDto {
  @IsBoundedId()
  id!: string;
}
