import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class HandleRazorpayWebhookDto {
  @ApiProperty()
  @IsString()
  razorpay_order_id!: string;

  @ApiProperty()
  @IsString()
  razorpay_payment_id!: string;

  @ApiProperty()
  @IsString()
  razorpay_signature!: string;
}
