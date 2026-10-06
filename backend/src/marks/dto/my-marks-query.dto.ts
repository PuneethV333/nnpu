import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

/** Query for `GET /marks/me`. */
export class MyMarksQueryDto {
  @ApiProperty({
    example: 'clx1122334455abcdefghijk',
    required: false,
    description: 'Omit to return every subject',
  })
  @IsOptional()
  @IsBoundedId()
  subjectId?: string;
}
