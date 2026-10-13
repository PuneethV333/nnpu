import { ApiProperty } from '@nestjs/swagger';
import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

/** Route params for `GET /marks/assessment/:assessmentId/marks`. */
export class AssessmentMarksParamsDto {
  @ApiProperty({ example: 'clx1234567890abcdefghijk' })
  @IsBoundedId()
  assessmentId!: string;
}
