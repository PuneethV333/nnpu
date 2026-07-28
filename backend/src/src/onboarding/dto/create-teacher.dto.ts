import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTeacherDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  profilePic?: string;

  @IsString()
  @IsNotEmpty()
  schoolId!: string;
}
