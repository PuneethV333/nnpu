import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class getMyAttendanceDto {
  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  to!: string;
}
