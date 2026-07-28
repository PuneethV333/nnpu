import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MarksQueryDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  subjectId?: string;
}
