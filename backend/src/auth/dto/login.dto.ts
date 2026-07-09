import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @ApiProperty({ example: 'nnpu1sb26ka1' })
  authId!: string;

  @IsString()
  @MinLength(6)
  @ApiProperty({ example: 'nnpu123' })
  password!: string;
}
