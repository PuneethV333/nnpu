import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { Stream } from '@/generated/prisma';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  profilePic?: string;

  @IsString()
  @IsNotEmpty()
  schoolId!: string;

  @IsIn(['1', '2'])
  classYear!: string;

  @IsString()
  @IsNotEmpty()
  subjectCode!: string;

  @IsIn(['Kannada', 'Hindi', 'Sanskrit'])
  language!: string;

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
}
