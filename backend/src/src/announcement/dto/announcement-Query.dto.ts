import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnnouncementDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 1 })
  readonly page!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 10 })
  readonly pageSize!: number;
}
