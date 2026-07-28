import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ enum: ['android', 'ios'] })
  @IsIn(['android', 'ios'])
  platform!: 'android' | 'ios';
}
