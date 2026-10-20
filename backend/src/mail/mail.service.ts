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
      // Two minutes for the whole attempt, not two minutes per phase: connect 60s,
      // greeting 30s, 60s of socket inactivity. Three phases at 120s each would be
      // six minutes, which no caller can wait for. Nodemailer's own default is a
      // 120s connect plus a ten-minute socket, so its "no timeout" is really a very
      // long one.
      connectionTimeout: 60_000,
      greetingTimeout: 30_000,
      socketTimeout: 60_000,
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

  /**
   * Sends a batch under one shared wall-clock budget rather than one timeout per
   * message.
   *
   * The only caller is the cohort import, which runs inside the request that
   * created the accounts, so the budget is the longest the batch may occupy that
   * request. Whatever is left when it runs out is reported as not delivered
   * instead of attempted, because a mail host that has not answered in that long
   * will not answer on the next recipient either.
   *
   * Five minutes is a whole cohort at 500ms spacing plus a sub-second send; a
   * host that is merely slow still gets its time, and a host that is dead is
   * abandoned after roughly two or three connection timeouts rather than one per
   * recipient.
   */
  async sendBulk(
    inputs: SendMailInput[],
    delayMs = 500,
    budgetMs = 300_000,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;
    const deadline = Date.now() + budgetMs;

    for (const input of inputs) {
      if (Date.now() >= deadline) {
        const unattempted = inputs.length - sent - failed;
        failed += unattempted;
        this.logger.error(
          `[mail] bulk send stopped at its ${budgetMs / 1000}s budget: ${sent} sent, ${unattempted} not attempted`,
        );
        break;
      }

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
