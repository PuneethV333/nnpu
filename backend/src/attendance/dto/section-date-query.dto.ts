import { ApiProperty } from '@nestjs/swagger';
import { IsDateOnly } from '@/common/decorators/is-date-only.decorator';
import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

/**
 * Query for `GET /attendance/roster` and `GET /attendance/status`.
 *
 * `sectionId` must be REQUIRED, not optional. When it was absent,
 * `assertSectionAccess(undefined, ...)` built `where: { id: undefined }`, and
 * Prisma drops an `undefined` field from a `where` clause rather than matching
 * nothing (verified against the dev database: `findMany({ where: { id:
 * undefined } })` returned every row). The check therefore degraded to "this
 * teacher teaches *some* section", passed, and the follow-up queries ran with
 * no section filter at all — so the roster endpoint returned every student in
 * the school.
 */
export class SectionDateQueryDto {
  @ApiProperty({ example: 'clx1234567890abcdefghijk' })
  @IsBoundedId()
  sectionId!: string;

  @ApiProperty({ example: '2026-10-04' })
  @IsDateOnly()
  date!: string;
}
