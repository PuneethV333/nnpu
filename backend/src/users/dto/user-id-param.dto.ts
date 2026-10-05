import { ApiProperty } from '@nestjs/swagger';
import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

/** Route param for the `/users/:userId/*` lifecycle routes. */
export class UserIdParamDto {
  @ApiProperty({ example: 'clx1234567890abcdefghijk' })
  @IsBoundedId()
  userId!: string;
}
