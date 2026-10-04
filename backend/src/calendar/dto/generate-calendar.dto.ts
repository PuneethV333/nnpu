import { DayType } from '@/generated/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
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
  @ApiProperty({ example: 2026, minimum: 2000, maximum: 2100 })
  @IsInt()
  // generateYear loops day-by-day over the whole year, so an unbounded value
  // (a typo like 20260) would attempt a quarter of a million upserts.
  @Min(2000)
  @Max(2100)
  year!: number;

  @ApiProperty({ type: [CalendarOverrideDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalendarOverrideDto)
  overrides!: CalendarOverrideDto[];
}
