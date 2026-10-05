import { ApiProperty } from '@nestjs/swagger';
import { IsDateOnly } from '@/common/decorators/is-date-only.decorator';

/**
 * Query for `GET /calendar`.
 *
 * `from`/`to` are interpolated straight into the Redis key `range:${from}:${to}`
 * and `getRange` caches on the exact pair requested. Validating the format
 * bounds the key space to real calendar dates, and `MAX_RANGE_DAYS` (enforced in
 * the service) stops a caller from minting a key per request forever.
 */
export class CalendarRangeQueryDto {
  @ApiProperty({ example: '2026-06-01' })
  @IsDateOnly()
  from!: string;

  @ApiProperty({ example: '2026-10-04' })
  @IsDateOnly()
  to!: string;
}
