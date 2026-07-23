/* eslint-disable @typescript-eslint/restrict-template-expressions */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@/logger/logger.service';
import { createTransport, type Transporter } from 'nodemailer';

interface SendMailInput {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private transporter!: Transporter;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit() {
    this.transporter = createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT'),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });

    this.logger.log('MailService initialized');
  }

  async send(input: SendMailInput): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM'),
        to: input.to,
        subject: input.subject,
        text: input.body,
        html: input.html,
      });

      this.logger.log(`[mail] sent to ${input.to}: ${input.subject}`);
    } catch (err) {
      this.logger.error(`[mail] failed to send to ${input.to}: ${err}`);
      throw err;
    }
  }

  async sendBulk(
    inputs: SendMailInput[],
    delayMs = 500,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const input of inputs) {
      try {
        await this.send(input);
        sent++;
      } catch {
        failed++;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    this.logger.log(
      `[mail] bulk send complete: ${sent} sent, ${failed} failed`,
    );
    return { sent, failed };
  }
}
