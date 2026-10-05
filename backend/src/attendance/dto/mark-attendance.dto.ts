import { AttendanceStatus } from '@/generated/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  IsDateString,
  IsIn,
  IsString,
  ValidateNested,
} from 'class-validator';

/**
 * The statuses a teacher is allowed to submit.
 *
 * `NotMarked` is deliberately excluded even though it is a valid
 * `AttendanceStatus`. It is a *system* sentinel: the seeding cron creates rows
 * with no `status`, which defaults to `NotMarked`, and three separate queries
 * (`reminder`, `dashboard`, `getAttendanceStatus`) read it back to mean "this
 * student has not been marked yet". It is a state the database arrives at on
 * its own, never one a client declares.
 *
 * Accepting it here let a client set `NotMarked` while `markAttendance` still
 * stamped `markedById` and `markedAt`, producing a row that read as locked but
 * unmarked, attributed to a teacher who never marked it, and invisible to the
 * `status: { not: 'NotMarked' }` reminder queries.
 *
 * Derived from the enum rather than hardcoded, so a future status is picked up
 * automatically — with `NotMarked` staying excluded by name.
 */
export const MARKABLE_ATTENDANCE_STATUSES = Object.values(
  AttendanceStatus,
).filter((status) => status !== AttendanceStatus.NotMarked);

export type MarkableAttendanceStatus = Exclude<AttendanceStatus, 'NotMarked'>;

export class MarkEntryDto {
  @ApiProperty()
  @IsString()
  studentId!: string;

  @ApiProperty({ enum: MARKABLE_ATTENDANCE_STATUSES })
  @IsIn(MARKABLE_ATTENDANCE_STATUSES)
  status!: MarkableAttendanceStatus;
}

export class MarkAttendanceDto {
  @ApiProperty()
  @IsString()
  sectionId!: string;

  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiProperty({ type: [MarkEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MarkEntryDto)
  entries!: MarkEntryDto[];
}
