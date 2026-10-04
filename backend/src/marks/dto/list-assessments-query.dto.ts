import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Query for `GET /marks/assessment`.
 *
 * These were previously read as bare `@Query('sectionId') sectionId: string`
 * parameters. A missing `sectionId` therefore arrived as `undefined`, which
 * Prisma silently ignores in a `where` clause — so the query degenerated to
 * "every assessment in the school" instead of erroring. Validating here makes
 * the filter mandatory.
 */
export class ListAssessmentsQueryDto {
  @ApiProperty({ description: 'Section whose assessments are requested' })
  @IsString()
  @IsNotEmpty()
  readonly sectionId!: string;

  @ApiPropertyOptional({ description: 'Restrict to a single subject' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly subjectId?: string;
}
