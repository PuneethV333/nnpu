import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateSectionDto {
  @IsIn(['1', '2'])
  classYear!: string;

  @IsString()
  @IsNotEmpty()
  session!: string; // e.g. "A"

  @IsString()
  @IsNotEmpty()
  academicYearId!: string;
}
