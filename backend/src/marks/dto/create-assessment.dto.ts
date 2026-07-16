import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AssessmentCategory } from '@/generated/prisma';

export class CreateAssessmentDto {
  @ApiProperty({ example: 'Unit Test 1' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: AssessmentCategory })
  @IsEnum(AssessmentCategory)
  category!: AssessmentCategory;

  @ApiProperty()
  @IsString()
  subjectId!: string;

  @ApiProperty()
  @IsString()
  sectionId!: string;

  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(1)
  maxMarks!: number;

  @ApiProperty({ required: false, example: '2026-07-15' })
  @IsOptional()
  @IsDateString()
  date?: string;
}
