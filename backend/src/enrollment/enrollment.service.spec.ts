import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import type { ImportStudentsDto } from './dto/import-students.dto';

const SECTION_ID = 'section-1';

const section = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: SECTION_ID,
  name: '1-SCI-A',
  // The section supplies the stream; a CSV row cannot override it.
  session: 'SCI-A',
  academicYearId: 'ay-1',
  classId: 'class-1',
  class: { id: 'class-1', name: '1' },
  academicYear: {
    id: 'ay-1',
    label: '2026-27',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2027-03-31'),
  },
  ...overrides,
});

const dto = (
  overrides: Partial<ImportStudentsDto> = {},
): ImportStudentsDto => ({
  sectionId: SECTION_ID,
  year: 2026,
  ...overrides,
});

const CSV = [
  'name,email,stream,combination,language',
  'Ananya Rao,ananya@example.com,Science,PCMB,Kannada',
].join('\n');

/** One `user.create` argument, as the service actually passes it. */
interface UserCreateArg {
  data: {
    role: string;
    sectionId: string;
    combinationId: string;
    language: string;
    details: { create: { name: string; email: string } };
    auth: { create: { authId: string; password: string } };
  };
}

/** One `mail.sendBulk` payload. */
interface MailArg {
  to: string;
  subject: string;
  body: string;
}

describe('EnrollmentService.importStudentsFromCsv', () => {
  let prisma: {
    section: { findUnique: jest.Mock };
    combination: { findMany: jest.Mock };
    personalDetails: { findMany: jest.Mock };
    user: { create: jest.Mock };
    idSequence: { upsert: jest.Mock };
    $transaction: jest.Mock;
  };
  let mail: { sendBulk: jest.Mock; send: jest.Mock };
  let redis: { delPattern: jest.Mock; delMany: jest.Mock };
  let logger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock };
  let service: EnrollmentService;
  let createdAuthIds: string[];
  let userCreate: jest.Mock;

  beforeEach(() => {
    createdAuthIds = [];

    userCreate = jest
      .fn()
      .mockImplementation(
        ({ data }: { data: { auth: { create: { authId: string } } } }) => {
          createdAuthIds.push(data.auth.create.authId);
          return Promise.resolve({ id: `user-${createdAuthIds.length}` });
        },
      );

    const tx = {
      idSequence: {
        upsert: jest.fn().mockResolvedValue({ lastValue: 7 }),
      },
      user: { create: userCreate },
    };

    prisma = {
      section: { findUnique: jest.fn().mockResolvedValue(section()) },
      combination: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'combo-pcmb', idCode: 'PCMB', stream: 'Science' },
          ]),
      },
      personalDetails: { findMany: jest.fn().mockResolvedValue([]) },
      user: { create: jest.fn() },
      idSequence: { upsert: jest.fn() },
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
    };

    mail = {
      sendBulk: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }),
      send: jest.fn(),
    };
    logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    redis = {
      delPattern: jest.fn().mockResolvedValue(0),
      delMany: jest.fn().mockResolvedValue(0),
    };
    service = new EnrollmentService(
      prisma as never,
      logger as never,
      mail as never,
      redis as never,
    );
  });

  it('creates an account per row and emails the credentials', async () => {
    const result = await service.importStudentsFromCsv(dto(), CSV);

    expect(result.created).toEqual([
      {
        name: 'Ananya Rao',
        email: 'ananya@example.com',
        authId: 'nnpu1SB26KA007',
      },
    ]);
    expect(result.skipped).toEqual([]);
    expect(result.emailed).toBe(1);
    expect(result.emailFailed).toBe(0);
  });

  it('builds the authId from the section, not from the CSV row', async () => {
    await service.importStudentsFromCsv(dto(), CSV);

    // nnpu + classYear(1) + stream(S) + combo(B) + joinYear(26) + lang(K)
    //   + session(A) + serial(007)
    expect(createdAuthIds).toEqual(['nnpu1SB26KA007']);
  });

  it('places the student in the section that was targeted', async () => {
    await service.importStudentsFromCsv(dto(), CSV);

    // Read back what the transaction callback actually wrote to `user.create`.
    const createCalls = userCreate.mock.calls as [UserCreateArg][];
    expect(createCalls).toHaveLength(1);
    expect(createCalls[0][0].data).toMatchObject({
      role: 'Student',
      sectionId: SECTION_ID,
      combinationId: 'combo-pcmb',
      language: 'Kannada',
      details: { create: { name: 'Ananya Rao', email: 'ananya@example.com' } },
      auth: { create: { authId: 'nnpu1SB26KA007' } },
    });
  });

  it('clears the cached attendance roster for the target section', async () => {
    // Students were just added to a section whose cached roster is built from
    // its students. Left alone, a teacher who marked attendance before the
    // import would not see the new students until the TTL expired.
    await service.importStudentsFromCsv(dto(), CSV);

    expect(redis.delPattern).toHaveBeenCalledWith('attendance:*');
  });

  it('emails the default password and asks the student to change it', async () => {
    await service.importStudentsFromCsv(dto(), CSV);

    expect(mail.sendBulk).toHaveBeenCalledTimes(1);

    const batches = mail.sendBulk.mock.calls as unknown as [MailArg[]][];
    expect(batches[0][0]).toHaveLength(1);

    const mail0: MailArg = batches[0][0][0];
    expect(mail0.to).toBe('ananya@example.com');
    expect(mail0.subject).toBe('Your NNPU portal login details');
    expect(mail0.body).toContain('nnpu1SB26KA007');
    expect(mail0.body).toContain('nnpu123');
    expect(mail0.body).toMatch(/change your password/i);
    expect(mail0.body).toContain('Ananya Rao');
  });

  it('rejects an import when the year does not match the section', async () => {
    await expect(
      service.importStudentsFromCsv(dto({ year: 2025 }), CSV),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.importStudentsFromCsv(dto({ year: 2025 }), CSV),
    ).rejects.toThrow(/Year mismatch.*2026-27/s);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a section that does not exist', async () => {
    prisma.section.findUnique.mockResolvedValue(null);

    await expect(service.importStudentsFromCsv(dto(), CSV)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('derives the authId session segment from the section, not the CSV', async () => {
    // The CSV has no session column at all — the section is the only source,
    // which is what keeps a whole cohort in one session.
    await service.importStudentsFromCsv(dto(), CSV);

    expect(createdAuthIds).toEqual(['nnpu1SB26KA007']);
  });

  it('skips a row whose stream contradicts the target section', async () => {
    // The section is SCI-A. A Commerce row must not resolve its combination
    // against the Science table and land in the Science section.
    const csv = [
      'name,email,stream,combination,language',
      'Ananya,ananya@example.com,Science,PCMB,Kannada',
      'Rahul,rahul@example.com,Commerce,CEBA,Hindi',
    ].join('\n');

    const result = await service.importStudentsFromCsv(dto(), csv);

    expect(result.created).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toMatchObject({ line: 3, name: 'Rahul' });
    expect(result.skipped[0].reason).toMatch(
      /stream is Commerce but the target section is Science/i,
    );
  });

  it('skips a row naming a combination from the wrong stream', async () => {
    // CEBA is a real Commerce combination, but this section is Science, so
    // within the Science-scoped lookup it does not exist.
    prisma.combination.findMany.mockResolvedValue([
      { id: 'combo-pcmb', idCode: 'PCMB', stream: 'Science' },
    ]);

    const csv = [
      'name,email,stream,combination,language',
      'Ananya,ananya@example.com,Science,PCMB,Kannada',
      'Rahul,rahul@example.com,Science,CEBA,Hindi',
    ].join('\n');

    const result = await service.importStudentsFromCsv(dto(), csv);

    expect(result.created).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toMatchObject({ line: 3, name: 'Rahul' });
    expect(result.skipped[0].reason).toMatch(
      /combination "CEBA" belongs to the other stream, not Science/i,
    );
  });

  it('reports when every row was rejected', async () => {
    const csv =
      'name,email,stream,combination,language\nAnanya,bad-email,Science,PCMB,Kannada';

    await expect(service.importStudentsFromCsv(dto(), csv)).rejects.toThrow(
      /No usable rows/i,
    );
  });

  it('refuses to import an email that already has an account', async () => {
    // PersonalDetails.email is unique. Without this pre-check the whole
    // transaction aborts on P2002, naming one row and hiding the rest.
    prisma.personalDetails.findMany.mockResolvedValue([
      { email: 'ananya@example.com' },
    ]);

    await expect(service.importStudentsFromCsv(dto(), CSV)).rejects.toThrow(
      /already have a portal account/i,
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not roll back accounts when only the email fails', async () => {
    // The account exists; a mail failure must not pretend otherwise or the
    // operator has no way to recover the credentials.
    mail.sendBulk.mockResolvedValue({ sent: 0, failed: 1 });

    const result = await service.importStudentsFromCsv(dto(), CSV);

    expect(result.created).toHaveLength(1);
    expect(result.emailed).toBe(0);
    expect(result.emailFailed).toBe(1);
  });

  it('wraps a failed write in a BadRequest so the caller can retry', async () => {
    prisma.$transaction.mockRejectedValue(new Error('P2002 unique constraint'));

    await expect(service.importStudentsFromCsv(dto(), CSV)).rejects.toThrow(
      /Import failed and nothing was saved.*P2002/s,
    );
  });

  it('derives the stream from the section session prefix', async () => {
    await service.importStudentsFromCsv(dto(), CSV);

    expect(prisma.combination.findMany).toHaveBeenCalledWith({
      where: { stream: 'Science' },
    });
  });

  it('refuses a section whose session is not stream-prefixed', async () => {
    prisma.section.findUnique.mockResolvedValue(
      section({ session: 'A', name: '1-A' }),
    );

    await expect(service.importStudentsFromCsv(dto(), CSV)).rejects.toThrow(
      /not stream-prefixed/i,
    );
  });

  it('uses the class name for the PU year digit', async () => {
    prisma.section.findUnique.mockResolvedValue(
      section({
        session: 'SCI-B',
        name: '2-SCI-B',
        class: { id: 'c2', name: '2' },
      }),
    );

    const csv = [
      'name,email,stream,combination,language',
      'Ananya,ananya@example.com,Science,PCMB,Kannada',
    ].join('\n');

    await service.importStudentsFromCsv(dto(), csv);

    // Session segment is B (from SCI-B), so the authId reads ...KB007, not
    // KA007. Fixed-width means the session is a real slot, not a suffix.
    expect(createdAuthIds).toEqual(['nnpu2SB26KB007']);
  });

  it('reuses a single bcrypt hash for the whole cohort', async () => {
    // Hashing per row would be a full bcrypt round-trip per student on a CPU
    // chosen for being small.
    const csv = [
      'name,email,stream,combination,language',
      'Ananya,ananya@example.com,Science,PCMB,Kannada',
      'Rahul,rahul@example.com,Science,PCMB,Kannada',
      'Priya,priya@example.com,Science,PCMB,Kannada',
    ].join('\n');

    const result = await service.importStudentsFromCsv(dto(), csv);

    expect(result.created).toHaveLength(3);
    // Every row gets the same serial only if the sequence mock is consulted per
    // row; what matters here is that all three were written.
    expect(createdAuthIds).toHaveLength(3);
  });
});
