import { ApiProperty } from '@nestjs/swagger';
import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

/** Route params for `GET /marks/report/:studentId/:subjectId`. */
export class ReportParamsDto {
  @ApiProperty({ example: 'clx1234567890abcdefghijk' })
  @IsBoundedId()
  studentId!: string;

  @ApiProperty({ example: 'clx1122334455abcdefghijk' })
  @IsBoundedId()
  subjectId!: string;
}
