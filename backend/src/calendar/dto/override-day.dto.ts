import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DayType } from '@/generated/prisma/enums';

export class OverrideDayDto {
  @ApiProperty({ enum: DayType })
  @IsEnum(DayType)
  type!: DayType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  label?: string;
}
