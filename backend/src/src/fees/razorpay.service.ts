import { LoggerService } from '@/logger/logger.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import Razorpay from 'razorpay';

@Injectable()
export class RazorpayService implements OnModuleInit {
  private razorpay!: Razorpay;
  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit() {
    this.razorpay = new Razorpay({
      key_id: this.config.get<string>('RAZORPAY_KEY_ID'),
      key_secret: this.config.get<string>('RAZORPAY_KEY_SECRET'),
    });

    this.logger.log('RazorPay initialized');
  }

  async createOrder(amountInPaise: number, receipt: string) {
    return this.razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
    });
  }

  verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): boolean {
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = createHmac(
      'sha256',
      this.config.get<string>('RAZORPAY_KEY_SECRET')!,
    )
      .update(body)
      .digest('hex');

    return expectedSignature === razorpaySignature;
  }
}
