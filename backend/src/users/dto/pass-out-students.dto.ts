import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

class PassOutSectionDto {
  @ApiProperty({ example: 'clx1234567890abcdefghijk' })
  @IsBoundedId()
  sectionId!: string;
}

export class PassOutStudentsDto {
  /**
   * The sections whose students passed out.
   *
   * Several at once, because a graduating cohort is usually promoted section
   * by section and then passed out together once the year closes — passing them
   * out one section per request would mean N near-identical calls that each
   * carry the same risk of being half-finished.
   */
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @Type(() => PassOutSectionDto)
  sections!: PassOutSectionDto[];

  /**
   * Why they were passed out, recorded in the logs only.
   *
   * Not stored: `User` has no column for it, and inventing one to hold a free
   * -text note would be a schema change for a value nothing reads. The log line
   * is what makes "why did these 120 accounts go inactive on the 8th" answerable.
   */
  @ApiPropertyOptional({ example: 'Completed 2nd PUC' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  /**
   * Report what would be deactivated without writing.
   *
   * A pass-out is a one-way bulk change to a whole cohort's accounts. Sessions
   * are revoked as part of it, so the operator should see the count first.
   */
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
