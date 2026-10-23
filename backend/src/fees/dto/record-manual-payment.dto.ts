import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@/generated/prisma';

/**
 * Money that arrived outside Razorpay: cash at the office, a UPI transfer, a
 * cheque, a bank transfer. `RAZORPAY` is deliberately absent — those rows are
 * only ever created by `createPaymentOrder`, and letting an admin hand-write one
 * would let a fake payment id satisfy `verifyPayment`.
 */
export const MANUAL_PAYMENT_METHODS = [
  PaymentMethod.CASH,
  PaymentMethod.UPI,
  PaymentMethod.CHEQUE,
  PaymentMethod.BANK_TRANSFER,
] as const;

export class RecordManualPaymentDto {
  @ApiProperty({
    required: false,
    description:
      'Paise. Omitted means the whole outstanding balance, which is the normal case for a counter payment.',
    example: 4500000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @ApiProperty({ enum: MANUAL_PAYMENT_METHODS, example: 'CASH' })
  @IsIn(MANUAL_PAYMENT_METHODS)
  method!: (typeof MANUAL_PAYMENT_METHODS)[number];

  @ApiProperty({
    required: false,
    description: 'Receipt number, cheque number or transfer reference.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}
