import {
  IsIn,
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Stream } from '@/generated/prisma';

export class CreateSectionsBulkDto {
  @IsIn(['1', '2'])
  classYear!: string;

  @IsString()
  @IsNotEmpty()
  academicYearId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  sessions!: string[]; // display labels, e.g. ["A", "B"]

  /**
   * Required because `Section` is unique on [classId, session, academicYearId]
   * with no `stream` column: the stored session value has to be
   * stream-disambiguated ("SCI-A" / "COM-A") for Science and Commerce to coexist
   * in one class. See `sectionSessionKey`.
   */

  @IsIn(['Science', 'Commerce'])
  stream!: Stream;
}
