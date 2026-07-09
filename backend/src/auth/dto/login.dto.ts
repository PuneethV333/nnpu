import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  authId!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
