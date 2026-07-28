import { DayType } from '@/generated/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CalendarOverrideDto {
  @IsDateString()
  date!: string;

  @IsEnum(DayType)
  type!: DayType;

  @IsOptional()
  @IsString()
  label?: string;
}

export class GenerateCalendarDto {
  @ApiProperty({ example: 2026 })
  @IsInt()
  year!: number;

  @ApiProperty({ type: [CalendarOverrideDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalendarOverrideDto)
  overrides!: CalendarOverrideDto[];
}
