import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSchool {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;
}
