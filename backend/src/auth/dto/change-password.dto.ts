import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class changePasswordDto {
  @IsString()
  @MinLength(6)
  @ApiProperty({ example: 'nnpu123' })
  oldPassWord!: string;

  @IsString()
  @MinLength(6)
  @ApiProperty({ example: 'mamatha44' })
  newPassWord!: string;
}
