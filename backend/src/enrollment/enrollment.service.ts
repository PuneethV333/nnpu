import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { Prisma, SecondLanguage, Stream } from '@/generated/prisma';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';
import { MailService } from '@/mail/mail.service';
import {
  COMBO_CODE,
  LANG_CODE,
  STREAM_CODE,
  extractPuYear,
} from '@/onboarding/helper/helper';
import {
  SECTION_STREAM_PREFIX,
  authIdSessionSegment,
} from '@/common/utils/section-session.util';
import { ImportStudentsDto } from './dto/import-students.dto';
import {
  parseStudentCsv,
  type StudentCsvRow,
  type StudentCsvRowError,
} from './csv/parse-student-csv';

/**
 * The default password handed to every imported student.
 *
 * Requested, and shared across the whole cohort. Worth stating plainly: this
 * is not a secret. Anyone who learns one student's authId can sign in as any
 * other student in the same combination by guessing `nnpu123`. The credential
 * email asks every recipient to change it, which is the only control here.
 */
const DEFAULT_PASSWORD = 'nnpu123';

export interface ImportedStudent {
  name: string;
  email: string;
  authId: string;
}

export interface ImportStudentsResult {
  /** Rows that produced an account. */
  created: ImportedStudent[];
  /** Rows rejected before any write. */
  skipped: StudentCsvRowError[];
  /** How many of `created` actually received their email. */
  emailed: number;
  /** How many accounts exist but whose email did not send. */
  emailFailed: number;
}

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly mail: MailService,
  ) {}

  /**
   * Imports a CSV roster into one section.
   *
   * The section is the unit of truth: it supplies the class (and so the PU year
   * digit in the authId), the stream (and so the section's `SCI-`/`COM-`
   * prefix), and the academic year (and so the join-year digits). A row cannot
   * choose any of those, which is deliberate — a student row that named its own
   * class or year would let one bad file scatter a cohort across sections.
   *
   * All-or-nothing: any valid row that fails to write aborts the whole import
   * and restores every row already written. A half-imported section is worse
   * than a failed one, because the operator has no way to tell which students
   * exist and which do not, and re-running would collide on
   * `PersonalDetails.email` for the ones that landed.
   */
  async importStudentsFromCsv(
    dto: ImportStudentsDto,
    fileContent: string,
  ): Promise<ImportStudentsResult> {
    const section = await this.resolveTargetSection(dto);

    const { rows, errors } = parseStudentCsv(fileContent);

    if (rows.length === 0) {
      throw new BadRequestException(
        `No usable rows in the CSV. ${errors.length} row(s) rejected: ${describeErrors(errors)}`,
      );
    }

    const sectionStream = this.sectionStream(section.session);

    // Combination is per-stream in the schema (`@@unique([stream, idCode])`).
    //
    // The lookup is scoped to the *section's* stream, so a row claiming the
    // other stream resolves its combination against the wrong table — a
    // Commerce row in a `SCI-A` section would look up PCMB (a Science combo),
    // find it, and be written as a Science student in the Science section. The
    // row's own stream column is therefore checked against the section before
    // anything else, so the operator is told which row went to the wrong
    // session instead of finding out after the import.
    const combinations = await this.prisma.combination.findMany({
      where: { stream: sectionStream },
    });

    const combinationByCode = new Map(
      combinations.map((c) => [c.idCode.toUpperCase(), c]),
    );

    // One bcrypt hash reused for every student. Hashing the same password once
    // per row would cost a full bcrypt round-trip per student on a CPU already
    // chosen for being small.
    const hashedPassword = await hash(DEFAULT_PASSWORD, 10);
    const puYear = extractPuYear(section.class.name);
    const joinYear = section.academicYear.startDate.getFullYear();
    const sessionCode = authIdSessionSegment(section.session);

    const importable: Array<{
      row: StudentCsvRow;
      combinationId: string;
    }> = [];
    const skipped: StudentCsvRowError[] = [...errors];

    for (const row of rows) {
      if (row.stream !== sectionStream) {
        skipped.push({
          line: row.line,
          name: row.name,
          reason: `stream is ${row.stream} but the target section is ${sectionStream}. Upload this row to the matching session.`,
        });
        continue;
      }

      const combination = combinationByCode.get(row.combinationCode);
      if (!combination) {
        skipped.push({
          line: row.line,
          name: row.name,
          reason:
            row.combinationCode in COMBO_CODE
              ? `combination "${row.combinationCode}" belongs to the other stream, not ${row.stream}`
              : `combination "${row.combinationCode}" does not exist for ${row.stream}`,
        });
        continue;
      }
      importable.push({ row, combinationId: combination.id });
    }

    if (importable.length === 0) {
      throw new BadRequestException(
        `Every row in the CSV was rejected. ${describeErrors(skipped)}`,
      );
    }

    // Guard against a re-upload of the same file: `PersonalDetails.email` is
    // unique, so without this the whole import aborts on a P2002 that names
    // only one of the offending rows.
    const emails = importable.map((i) => i.row.email);
    const alreadyExists = await this.prisma.personalDetails.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    });
    if (alreadyExists.length > 0) {
      const found = alreadyExists.map((e) => e.email).join(', ');
      throw new BadRequestException(
        `These emails already have a portal account: ${found}. Remove them from the CSV.`,
      );
    }

    // Fixed for every row in this import: they are all properties of the
    // section, not of the student. Passed as a flat object because `writeStudents`
    // should not have to know that.
    const created = await this.writeStudents(
      importable,
      section.id,
      { puYear, joinYear, sessionCode },
      hashedPassword,
    );

    // Accounts exist from here on. A mail failure must NOT undo them, or the
    // operator has no way to recover the credentials — so it is reported in the
    // result rather than thrown.
    const mailResult = await this.sendCredentialEmails(created);

    this.logger.log(
      `[import-students] section=${section.id} created=${created.length} emailed=${mailResult.sent} emailFailed=${mailResult.failed} skipped=${skipped.length}`,
    );

    return {
      created,
      skipped,
      emailed: mailResult.sent,
      emailFailed: mailResult.failed,
    };
  }

  /**
   * Resolves the target section and checks it against the `year` the admin
   * supplied.
   *
   * `Section` is unique on [classId, session, academicYearId], so the same
   * session name recurs every year and the id alone is not enough for a human
   * to be sure which one they picked. The `year` is therefore treated as an
   * assertion to be checked, not as a filter: it can only ever agree or
   * disagree, and a disagreement stops the import.
   */
  private async resolveTargetSection(dto: ImportStudentsDto) {
    const section = await this.prisma.section.findUnique({
      where: { id: dto.sectionId },
      include: { class: true, academicYear: true },
    });

    if (!section) {
      throw new NotFoundException(
        `Section ${dto.sectionId} not found. Create the session before importing students into it.`,
      );
    }

    const sectionYear = section.academicYear.startDate.getFullYear();
    if (sectionYear !== dto.year) {
      throw new BadRequestException(
        `Year mismatch: that section belongs to academic year ${section.academicYear.label} (starting ${sectionYear}), but ${dto.year} was supplied.`,
      );
    }

    return section;
  }

  /** The `Stream` a stored session key belongs to: "COM-B" -> "Commerce". */
  private sectionStream(sessionKey: string): Stream {
    const prefix = sessionKey.split('-')[0]?.toUpperCase();
    const match = (
      Object.entries(SECTION_STREAM_PREFIX) as [Stream, string][]
    ).find(([, value]) => value === prefix);

    if (!match) {
      throw new BadRequestException(
        `Section session "${sessionKey}" is not stream-prefixed, so its stream cannot be determined. Expected a value like SCI-A or COM-B.`,
      );
    }

    return match[0];
  }

  private async writeStudents(
    importable: { row: StudentCsvRow; combinationId: string }[],
    sectionId: string,
    ctx: { puYear: string; joinYear: number; sessionCode: string },
    hashedPassword: string,
  ): Promise<ImportedStudent[]> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created: ImportedStudent[] = [];

        for (const entry of importable) {
          const { row } = entry;

          // authId generation (including the sequence bump) happens inside the
          // transaction, so a later row's failure rolls back the sequence
          // increments too. No serial number is ever silently burned.
          const authId = await this.generateAuthId(tx, {
            puYear: ctx.puYear,
            stream: row.stream,
            comboIdCode: row.combinationCode,
            joinYear: ctx.joinYear,
            language: row.language,
            sessionCode: ctx.sessionCode,
          });

          await tx.user.create({
            data: {
              role: 'Student',
              sectionId,
              combinationId: entry.combinationId,
              language: row.language,
              details: {
                create: {
                  name: row.name,
                  email: row.email,
                  profilePic: '',
                },
              },
              auth: {
                create: { authId, password: hashedPassword },
              },
            },
          });

          created.push({ name: row.name, email: row.email, authId });
        }

        return created;
      });
    } catch (err) {
      this.logger.error(
        `[import-students] import aborted, no students were created: ${String(err)}`,
      );
      throw new BadRequestException(
        `Import failed and nothing was saved: ${errorMessage(err)}. Fix the file and upload it again.`,
      );
    }
  }

  private async sendCredentialEmails(
    students: ImportedStudent[],
  ): Promise<{ sent: number; failed: number }> {
    const inputs = students.map((student) => ({
      to: student.email,
      subject: 'Your NNPU portal login details',
      body: [
        `Hi ${student.name},`,
        '',
        'Welcome to NNPU. Your student portal account is now active.',
        '',
        `Login ID: ${student.authId}`,
        `Password: ${DEFAULT_PASSWORD}`,
        '',
        'Please change your password after your first login and do not share these details with anyone.',
        '',
        '— NNPU',
      ].join('\n'),
    }));

    // sendBulk already swallows per-recipient failures and delays between sends
    // to stay under SMTP rate limits, which is exactly the behaviour needed
    // when a single request fans out to an entire cohort.
    return this.mail.sendBulk(inputs);
  }

  private async generateAuthId(
    tx: Prisma.TransactionClient,
    params: {
      puYear: string;
      stream: Stream;
      comboIdCode: string;
      joinYear: number;
      language: SecondLanguage;
      sessionCode: string;
    },
  ): Promise<string> {
    const streamCode = STREAM_CODE[params.stream];
    const comboCode = COMBO_CODE[params.comboIdCode];
    const joinYear2 = params.joinYear.toString().slice(-2);
    const langCode = LANG_CODE[params.language];

    if (!comboCode) {
      throw new BadRequestException(
        `No authId code mapping for combination "${params.comboIdCode}"`,
      );
    }

    const bucketKey = `nnpu-${params.puYear}-${streamCode}-${comboCode}-${joinYear2}-${langCode}-${params.sessionCode}`;

    const seq = await tx.idSequence.upsert({
      where: { id: bucketKey },
      create: { id: bucketKey, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });

    const serial = String(seq.lastValue).padStart(3, '0');

    return `nnpu${params.puYear}${streamCode}${comboCode}${joinYear2}${langCode}${params.sessionCode}${serial}`;
  }
}

const describeErrors = (errors: StudentCsvRowError[]): string =>
  errors
    .slice(0, 10)
    .map((e) => `line ${e.line} (${e.name}): ${e.reason}`)
    .join('; ') + (errors.length > 10 ? ` (+${errors.length - 10} more)` : '');

const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);
