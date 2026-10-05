import { ApiProperty } from '@nestjs/swagger';
import { IsDateOnly } from '@/common/decorators/is-date-only.decorator';

/** Route params for `POST /calendar/day/:date/override`. */
export class OverrideDayParamDto {
  @ApiProperty({ example: '2026-10-04' })
  @IsDateOnly()
  date!: string;
}
