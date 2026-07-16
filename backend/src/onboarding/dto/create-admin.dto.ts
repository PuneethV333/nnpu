import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAdminDto {
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
