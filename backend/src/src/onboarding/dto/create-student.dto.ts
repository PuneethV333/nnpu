import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

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
  session!: string; // e.g. "A"
}
