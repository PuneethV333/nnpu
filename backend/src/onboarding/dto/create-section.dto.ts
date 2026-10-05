import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { Stream } from '@/generated/prisma';

export class CreateSectionDto {
  @IsIn(['1', '2'])
  classYear!: string;

  @IsString()
  @IsNotEmpty()
  session!: string; // display label, e.g. "A"

  /**
   * Required because `Section` is unique on [classId, session, academicYearId]
   * with no `stream` column: the stored session value has to be
   * stream-disambiguated ("SCI-A" / "COM-A") for Science and Commerce to coexist
   * in one class. See `sectionSessionKey`.
   */
  @IsIn(['Science', 'Commerce'])
  stream!: Stream;

  @IsString()
  @IsNotEmpty()
  academicYearId!: string;
}
