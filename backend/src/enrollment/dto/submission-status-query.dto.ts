import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { EnrollmentSubmissionStatus } from '@/generated/prisma';

/**
 * Query for `GET /enrollment/drive/:id/submissions`.
 *
 * Replaces an inline `Object.values(...).includes(...)` check in the controller.
 * Same guarantee, but as a DTO so it is documented in the OpenAPI spec and
 * cannot be forgotten by the next route added here.
 */
export class SubmissionStatusQueryDto {
  @ApiProperty({
    enum: EnrollmentSubmissionStatus,
    required: false,
    description: 'Omit to list every status',
  })
  @IsOptional()
  @IsEnum(EnrollmentSubmissionStatus)
  status?: EnrollmentSubmissionStatus;
}
