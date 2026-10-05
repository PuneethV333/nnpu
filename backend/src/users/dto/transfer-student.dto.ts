import { ApiProperty } from '@nestjs/swagger';
import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

/** Body for `POST /users/:studentId/transfer`. */
export class TransferStudentDto {
  @ApiProperty({ example: 'clx1234567890abcdefghijk' })
  @IsBoundedId()
  sectionId!: string;
}
