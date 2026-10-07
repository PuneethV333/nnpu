import { LoggerService } from '@/logger/logger.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
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

  async fetchPayment(paymentId: string) {
    return this.razorpay.payments.fetch(paymentId);
  }

  verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): boolean {
    const secret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!secret || !/^[a-f0-9]{64}$/i.test(razorpaySignature)) {
      return false;
    }

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = createHmac('sha256', secret)
      .update(body)
      .digest();
    const providedSignature = Buffer.from(razorpaySignature, 'hex');

    return (
      expectedSignature.length === providedSignature.length &&
      timingSafeEqual(expectedSignature, providedSignature)
    );
  }
}
