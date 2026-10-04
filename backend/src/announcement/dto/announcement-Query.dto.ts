import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
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
  // Previously unbounded: a huge pageSize was passed straight to Prisma's `take`
  // and became part of the Redis cache key, so one request could pull an
  // arbitrarily large result set and permanently mint a distinct cache entry.
  @Max(100)
  @ApiProperty({ example: 10, maximum: 100 })
  readonly pageSize!: number;
}
