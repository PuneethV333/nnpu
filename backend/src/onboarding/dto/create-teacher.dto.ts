import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { trimEach } from '@/common/utils/trim-array.util';

export class CreateTeacherDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  profilePic?: string;

  /**
   * Required, because the login ID and the shared password are delivered here.
   * `resetPassword` refuses to run for an account with no address for the same
   * reason — an account nobody can hand credentials to is not much use.
   */
  @IsEmail()
  @MaxLength(120)
  email!: string;

  /**
   * The subjects this teacher teaches.
   *
   * A required key that may be an empty array: absent would reach the service as
   * `undefined` and silently mean "no subjects", which is indistinguishable from
   * a typo'd field name. Validated against the `Subject` table before anything
   * is written, so a stale id cannot create a dangling row.
   *
   * The trimming and per-element validators are spelled out because
   * `IsBoundedId` cannot validate the elements of an array — see `trimEach`.
   */
  @IsArray()
  @ArrayMaxSize(30)
  @Transform(({ value }: { value: unknown }) => trimEach(value))
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(64, { each: true })
  subjectIds!: string[];

  @IsString()
  @IsNotEmpty()
  schoolId!: string;
}
