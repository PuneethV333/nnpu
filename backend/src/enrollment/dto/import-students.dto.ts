import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

/**
 * Multipart fields for a CSV student import.
 *
 * `sectionId` is the session being filled: an import always targets exactly
 * one Section, which is what the caller means by "trigger this after the
 * session is created".
 */
export class ImportStudentsDto {
  @ApiProperty({ example: 'clx1234567890abcdefghijk' })
  @IsBoundedId()
  sectionId!: string;

  /**
   * The academic year the admin believes they are importing into, as a 4-digit
   * year (2026 for the 2026-27 academic year).
   *
   * Not cosmetic. `Section` is unique on [classId, session, academicYearId],
   * so "session A" is ambiguous across years, and a mismatch would otherwise
   * silently fill last year's section. The service re-derives the year from the
   * Section itself and rejects the upload if these two disagree.
   */
  @ApiProperty({
    example: 2026,
    description: 'Start year of the section’s academic year, e.g. 2026',
  })
  @Type(() => Number)
  @IsInt({ message: 'year must be an integer, e.g. 2026' })
  @Min(2000)
  @Max(2100)
  year!: number;
}
