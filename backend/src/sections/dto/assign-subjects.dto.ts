import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

/**
 * Trim strings inside an array, mirroring `IsBoundedId`'s scalar trim.
 *
 * Its own function with an `unknown` return so the array branch never surfaces
 * as `any` to `@typescript-eslint/no-unsafe-return`.
 */
const trimEach = (value: unknown): unknown => {
  if (!Array.isArray(value)) return value;
  return (value as unknown[]).map((v) =>
    typeof v === 'string' ? v.trim() : v,
  );
};

export class SubjectAssignmentDto {
  @ApiProperty({ example: 'clx1122334455abcdefghijk' })
  @IsBoundedId()
  subjectId!: string;

  /**
   * Every teacher for this subject; an empty array leaves it unstaffed.
   *
   * Spelled out rather than `@IsBoundedId({ each: true })` because that helper is
   * built from the plain (non-`each`) class-validator decorators, so it cannot
   * validate the elements of an array. The trim transform is reproduced here for
   * the same reason it exists on the scalar id: a padded id would reach Prisma and
   * simply not match.
   *
   * An empty array is valid and means "not staffed yet" — `SectionSubject`
   * survives with no teacher rows, which is the normal pre-term state.
   */
  @ApiProperty({
    example: ['clx1234567890abcdefghijk'],
    description:
      'Teachers to assign. An empty array leaves the subject unstaffed.',
    type: [String],
  })
  @IsArray()
  @ArrayMaxSize(20)
  @Transform(({ value }: { value: unknown }) => trimEach(value))
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(64, { each: true })
  teacherIds!: string[];
}

/**
 * Replaces the subject-teacher assignments for one section.
 *
 * Applied as a set rather than one-at-a-time because a section normally has a
 * whole subject list to staff in a single pass, and each `SectionSubject` row
 * is keyed [sectionId, subjectId] — so this is an upsert per pair, followed by a
 * rewrite of that pair's `SectionSubjectTeacher` rows.
 */
export class AssignSubjectsDto {
  @ApiProperty({ type: [SubjectAssignmentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubjectAssignmentDto)
  assignments!: SubjectAssignmentDto[];
}
