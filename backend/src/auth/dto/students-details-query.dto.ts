import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Query for `GET /auth/students-details`.
 *
 * `sectionId` was previously a bare `@Query('sectionId')` parameter. When it was
 * omitted it arrived as `undefined`, and Prisma omits undefined keys from a
 * `where` clause — so the filter silently vanished and the endpoint returned
 * every active student in the school to any teacher. Making it required turns
 * that into a 400 instead.
 */
export class StudentsDetailsQueryDto {
  @ApiProperty({ description: 'Section whose students are requested' })
  @IsString()
  @IsNotEmpty()
  readonly sectionId!: string;
}
