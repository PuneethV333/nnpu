import { ApiProperty } from '@nestjs/swagger';
import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

/**
 * Query for `GET /fees/structure`.
 *
 * Both parts of the `sectionId_academicYearId` composite unique must be present.
 * Prisma throws when a composite-unique field is missing, so an absent value
 * surfaced as a 500 rather than a 400.
 */
export class FeeStructureQueryDto {
  @ApiProperty({ example: 'clx1234567890abcdefghijk' })
  @IsBoundedId()
  sectionId!: string;

  @ApiProperty({ example: 'clx0987654321abcdefghijk' })
  @IsBoundedId()
  academicYearId!: string;
}
