import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

export class SubjectAssignmentDto {
  @ApiProperty({ example: 'clx1122334455abcdefghijk' })
  @IsBoundedId()
  subjectId!: string;

  // `SectionSubject.teacherId` is nullable, so unassigning a subject is a real
  // operation. `@IsDefined()` forces the key to be present (an absent key would
  // reach Prisma as `undefined`, which means "leave unchanged" on update and
  // "null" on create — ambiguous), while `@ValidateIf` lets an explicit `null`
  // through without running the string/bounds validators on it.
  @ApiProperty({
    example: 'clx1234567890abcdefghijk',
    description: 'Teacher to assign. Pass null to unassign the subject.',
    nullable: true,
    type: String,
  })
  @IsDefined()
  @ValidateIf((_o, value: unknown) => value !== null)
  @IsBoundedId()
  teacherId!: string | null;
}

/**
 * Replaces the subject-teacher assignments for one section.
 *
 * Applied as a set rather than one-at-a-time because a section normally has a
 * whole subject list to staff in a single pass, and each `SectionSubject` row
 * is keyed [sectionId, subjectId] — so this is an upsert per pair.
 */
export class AssignSubjectsDto {
  @ApiProperty({ type: [SubjectAssignmentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubjectAssignmentDto)
  assignments!: SubjectAssignmentDto[];
}
