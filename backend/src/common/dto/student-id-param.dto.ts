import { ApiProperty } from '@nestjs/swagger';
import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

/** Route param for routes addressing a single student, e.g. `:studentId`. */
export class StudentIdParamDto {
  @ApiProperty({ example: 'clx1234567890abcdefghijk' })
  @IsBoundedId()
  studentId!: string;
}
