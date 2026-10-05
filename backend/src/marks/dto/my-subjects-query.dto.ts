import { ApiProperty } from '@nestjs/swagger';
import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

/**
 * Query for `GET /marks/my-subjects`.
 *
 * `sectionId` is required for the same reason as the attendance routes: a
 * missing value is dropped from the `where` clause, turning "subjects in this
 * section" into "every subject this teacher is assigned to, across all
 * sections".
 */
export class MySubjectsQueryDto {
  @ApiProperty({ example: 'clx1234567890abcdefghijk' })
  @IsBoundedId()
  sectionId!: string;
}
