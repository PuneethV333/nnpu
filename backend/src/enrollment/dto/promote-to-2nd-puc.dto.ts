import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

class PromoteSectionDto {
  @ApiProperty({ example: 'clx1234567890abcdefghijk' })
  @IsBoundedId()
  sectionId!: string;
}

export class PromoteTo2ndPucDto {
  /**
   * The 1st-PUC sections to promote.
   *
   * Explicit rather than "all 1st-PUC sections" on purpose. This is a
   * cohort-wide, one-way move, and an admin promoting Science A now must be
   * able to hold Commerce B back for a week without the endpoint offering a
   * way to undo a half-done batch.
   */
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @Type(() => PromoteSectionDto)
  sections!: PromoteSectionDto[];

  /**
   * The academic year to promote into.
   *
   * Omit it and the next year after the source sections' year is used, created
   * if it does not exist. Pass it to promote into a year that already exists
   * (re-running a promotion, or moving into a year set up by hand).
   */
  @ApiPropertyOptional({ example: 'clx1234567890abcdefghijk' })
  @IsOptional()
  @IsBoundedId()
  targetAcademicYearId?: string;

  /**
   * Report what would happen without writing anything.
   *
   * Not an afterthought: this moves every student in the listed sections, and
   * the target sections get created as a side effect. An admin should be able
   * to see the counts and the created-section list before committing.
   */
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
