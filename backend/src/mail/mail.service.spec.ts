import type { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { LoggerService } from '@/logger/logger.service';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const createTransportMock = createTransport as unknown as jest.Mock;

const recipients = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    to: `student${i + 1}@school.test`,
    subject: 'Your NNPU portal login details',
    body: 'body',
  }));

describe('MailService', () => {
  const transporter = { sendMail: jest.fn() };

  const build = () => {
    createTransportMock.mockReturnValue(transporter);

    const config = {
      get: jest.fn((key: string) => {
        if (key === 'SMTP_PORT') return 587;
        if (key === 'SMTP_SECURE') return 'false';
        return 'value';
      }),
    } as unknown as ConfigService;

    const logger = {
      log: jest.fn(),
      error: jest.fn(),
    } as unknown as LoggerService;

    const service = new MailService(config, logger);
    service.onModuleInit();
    return service;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('caps a whole SMTP attempt at about two minutes', () => {
    build();

    // Per phase, not 120s each: three phases at the nodemailer default would let
    // one message hold a request for six minutes, which no client waits for.
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionTimeout: 60_000,
        greetingTimeout: 30_000,
        socketTimeout: 60_000,
      }),
    );
  });

  it('sends the whole batch when it fits the budget', async () => {
    const service = build();
    transporter.sendMail.mockResolvedValue({});

    await expect(service.sendBulk(recipients(3), 0)).resolves.toEqual({
      sent: 3,
      failed: 0,
    });
  });

  it('stops a batch that has run out of time and reports the rest as undelivered', async () => {
    const service = build();

    // A zero budget is the exhausted case without waiting two minutes for it.
    await expect(service.sendBulk(recipients(3), 0, 0)).resolves.toEqual({
      sent: 0,
      failed: 3,
    });

    // Nothing is attempted once the budget is gone: the import that calls this is
    // holding a request open, and a cohort does not fit in the window.
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it('keeps going when one recipient is rejected', async () => {
    const service = build();
    transporter.sendMail
      .mockRejectedValueOnce(new Error('Mailbox unavailable'))
      .mockResolvedValue({});

    await expect(service.sendBulk(recipients(3), 0)).resolves.toEqual({
      sent: 2,
      failed: 1,
    });

    // A single bad address must not cost the rest of the cohort their details.
    expect(transporter.sendMail).toHaveBeenCalledTimes(3);
  });
});
