import { ApiProperty } from '@nestjs/swagger';
import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

/** Route param for the `/sections/:sectionId/*` assignment routes. */
export class SectionIdParamDto {
  @ApiProperty({ example: 'clx1234567890abcdefghijk' })
  @IsBoundedId()
  sectionId!: string;
}
