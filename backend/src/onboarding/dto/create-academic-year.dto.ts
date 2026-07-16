import { IsDateString, IsString, IsNotEmpty } from 'class-validator';

export class CreateAcademicYearDto {
  @IsString()
  @IsNotEmpty()
  label!: string; // e.g. "2026-2027"

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
