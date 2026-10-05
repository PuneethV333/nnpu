import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, ValidateIf } from 'class-validator';
import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

/**
 * Body for `PATCH /sections/:sectionId/class-teacher`.
 *
 * `teacherId` is nullable so a section can be unstaffed. `Section.classTeacherId`
 * is `@unique`, meaning one teacher can be class teacher of at most one section —
 * the service surfaces that as a 409 rather than a 500.
 */
export class SetClassTeacherDto {
  @ApiProperty({
    example: 'clx1234567890abcdefghijk',
    description: 'Teacher to make class teacher. Pass null to unassign.',
    nullable: true,
    type: String,
  })
  @IsDefined()
  @ValidateIf((_o, value: unknown) => value !== null)
  @IsBoundedId()
  teacherId!: string | null;
}
