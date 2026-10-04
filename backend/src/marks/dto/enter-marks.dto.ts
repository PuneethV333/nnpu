import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/** Named distinctly from the identically-named attendance DTO: Swagger keys
 *  schemas by class name, so two `MarkEntryDto` classes collide. */
export class MarkEntryForAssessmentDto {
  @ApiProperty()
  @IsString()
  studentId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  marksObtained!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class EnterMarksDto {
  @ApiProperty()
  @IsString()
  assessmentId!: string;

  @ApiProperty({ type: [MarkEntryForAssessmentDto] })
  @IsArray()
  // Without this an empty submission passed validation and only failed later,
  // downstream, with a much less obvious message.
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MarkEntryForAssessmentDto)
  entries!: MarkEntryForAssessmentDto[];
}
