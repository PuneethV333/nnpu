import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';
import { GoogleFormsService } from '@/google/google-forms.service';
import { MailService } from '@/mail/mail.service';
import { CreateDriveDto } from './dto/create-drive.dto';
import { hash } from 'bcrypt';
import { randomBytes } from 'crypto';
import {
  EnrollmentSubmissionStatus,
  Prisma,
  Stream,
  User,
} from '@/generated/prisma';
import type { forms_v1 } from 'googleapis';
import { getDriveReturnType } from './types/enrollment.types';
import { COMBO_CODE, LANG_CODE, STREAM_CODE } from '@/onboarding/helper/helper';
import {
  authIdSessionSegment,
  sectionName,
  sectionSessionKey as buildSectionSessionKey,
} from '@/common/utils/section-session.util';

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly formsService: GoogleFormsService,
    private readonly mail: MailService,
  ) {}

  async createDrive(dto: CreateDriveDto) {
    this.logger.log('[create-drive]');

    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    const classRecord = await this.prisma.class.findUnique({
      where: { name: '1' },
    });

    if (!classRecord) {
      throw new NotFoundException('Class "1" (1st PUC) not found');
    }

    const byStream = dto.sessions.reduce<Record<Stream, string[]>>(
      (acc, entry) => {
        acc[entry.stream].push(entry.name);
        return acc;
      },
      {
        Science: [],
        Commerce: [],
      },
    );

    const streamsToProcess = (['Science', 'Commerce'] as const).filter(
      (stream) => byStream[stream].length > 0,
    );

    const results = await Promise.all(
      streamsToProcess.map((stream) =>
        this.createStreamDrive(
          stream,
          byStream[stream],
          academicYear,
          classRecord.id,
          // The name, not a hardcoded "1". Enrollment is PU1-only today, but the
          // function already takes a classId and so looks general; passing the
          // name makes a class-2 section impossible to mislabel.
          classRecord.name,
          dto.closesAt,
        ),
      ),
    );

    return Object.fromEntries(
      streamsToProcess.map((stream, index) => [
        stream.toLowerCase(),
        results[index],
      ]),
    );
  }

  async listDrives() {
    return this.prisma.enrollmentDrive.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDrive(driveId: string): Promise<getDriveReturnType> {
    const drive = await this.prisma.enrollmentDrive.findUnique({
      where: { id: driveId },
      include: {
        submissions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!drive) throw new NotFoundException('Drive not found');

    const result: getDriveReturnType = {
      id: drive.id,
      academicYearId: drive.academicYearId,
      stream: drive.stream,
      status: drive.status,
      opensAt: drive.opensAt,
      closesAt: drive.closesAt,
      submissions: drive.submissions.map((submission) => ({
        id: submission.id,
        name: submission.name,
        email: submission.email,
        stream: submission.stream,
        session: submission.session,
        language: submission.language,
        submittedAt: submission.submittedAt,
        status: submission.status,
      })),
    };

    return result;
  }

  async listSubmissions(driveId: string, status?: EnrollmentSubmissionStatus) {
    return this.prisma.enrollmentSubmission.findMany({
      where: { driveId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'asc' },
    });
  }

  async promoteOne(submissionId: string) {
    // findUniqueOrThrow would surface a bad id in the URL as a 500. This is a
    // client mistake, so it is a 404.
    const submission = await this.prisma.enrollmentSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const claim = await this.prisma.enrollmentSubmission.updateMany({
      where: { id: submissionId, status: { not: 'Promoted' } },
      data: { status: 'Promoted' },
    });

    if (claim.count === 0) {
      throw new BadRequestException(
        'This submission has already been promoted',
      );
    }

    // Assigned inside the try, consumed after it.
    let created: { newUser: User; authId: string; tempPassword: string };

    try {
      const drive = await this.prisma.enrollmentDrive.findUniqueOrThrow({
        where: { id: submission.driveId },
      });

      const academicYear = await this.prisma.academicYear.findUniqueOrThrow({
        where: { id: drive.academicYearId },
      });

      const classRecord = await this.prisma.class.findUniqueOrThrow({
        where: { name: '1' },
      });

      const sectionSessionKey = buildSectionSessionKey(
        submission.stream,
        submission.session,
      );

      const section = await this.prisma.section.findUnique({
        where: {
          classId_session_academicYearId: {
            classId: classRecord.id,
            session: sectionSessionKey,
            academicYearId: drive.academicYearId,
          },
        },
      });

      if (!section) {
        throw new BadRequestException(
          `No matching section for ${submission.stream} session ${submission.session} in this academic year`,
        );
      }

      if (!submission.combinationId) {
        throw new BadRequestException(
          'Submission is missing a combination — cannot generate authId',
        );
      }
      const combination = await this.prisma.combination.findUniqueOrThrow({
        where: { id: submission.combinationId },
      });

      if (!submission.language) {
        throw new BadRequestException(
          'Submission is missing a second language — cannot generate authId',
        );
      }

      const tempPassword = randomBytes(4).toString('hex');
      const hashedPassword = await hash(tempPassword, 10);

      const user = await this.prisma.$transaction(async (tx) => {
        // authId generation (including the idSequence increment) happens
        // INSIDE this transaction — if user/auth creation fails below, the
        // whole transaction (including the sequence bump) rolls back
        // together, so no serial number is ever silently burned.
        const authId = await this.generateAuthId(tx, {
          puYear: '1', // enrollment is always 1st PUC freshers
          stream: submission.stream,
          comboIdCode: combination.idCode,
          joinYear: academicYear.startDate.getFullYear(),
          language: submission.language as 'Kannada' | 'Hindi' | 'Sanskrit',
          session: submission.session, // plain display name ("A"), not sectionSessionKey ("SCI-A")
        });

        const newUser = await tx.user.create({
          data: {
            role: 'Student',
            sectionId: section.id,
            combinationId: submission.combinationId,
            language: submission.language,
            details: {
              create: {
                name: submission.name,
                email: submission.email,
                profilePic: '',
              },
            },
            auth: {
              create: { authId, password: hashedPassword },
            },
          },
        });

        await tx.enrollmentSubmission.update({
          where: { id: submissionId },
          data: { promotedUserId: newUser.id },
        });

        return { newUser, authId, tempPassword };
      });

      created = user;
    } catch (err) {
      // Only a failure of the *creation transaction* makes this submission
      // retryable. It resets status to Pending so it can be picked up again.
      //
      // It used to wrap the email send in the same try, which meant a mail
      // provider hiccup reset the status while the User and Auth rows stayed
      // committed. Every retry then died on P2002 (PersonalDetails.email is
      // unique), so the student existed with credentials nobody had received
      // and could not be re-promoted.
      await this.prisma.enrollmentSubmission.update({
        where: { id: submissionId },
        data: { status: 'Pending' },
      });
      throw err;
    }

    // The account exists from here on, so this must stay outside the catch.
    await this.sendCredentials(
      submission,
      created.authId,
      created.tempPassword,
    );

    return created.newUser;
  }

  /**
   * Delivers login credentials for an account that already exists.
   *
   * A failure here is a delivery failure, not a creation failure: the
   * submission stays Promoted and the operator retries via
   * `resendOrPromote`. Signalling 503 rather than a generic 500 makes that
   * distinction visible to the client.
   */
  private async sendCredentials(
    submission: { name: string; email: string },
    authId: string,
    tempPassword: string,
  ): Promise<void> {
    try {
      await this.mail.send({
        to: submission.email,
        subject: 'Your School Portal Login',
        body: `Hi ${submission.name},\n\nYour login details:\nAuth ID: ${authId}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password.`,
      });
    } catch (err) {
      this.logger.error(
        `[enrollment] account created for ${submission.email} but the credentials email failed: ${String(err)}`,
      );
      throw new ServiceUnavailableException(
        'Account was created but the credentials email could not be sent. Use resend to deliver them.',
      );
    }
  }

  /**
   * Re-issues credentials for an already-promoted submission.
   *
   * Resets the temporary password rather than reusing it, and bumps
   * `tokenVersion` so any session established with the old password stops
   * validating. Note the old password is only recoverable from the earlier
   * email, so a fresh one is generated instead.
   */
  async resendCredentials(submissionId: string) {
    const submission = await this.prisma.enrollmentSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== 'Promoted' || !submission.promotedUserId) {
      throw new BadRequestException(
        'Only a promoted submission has credentials to resend',
      );
    }

    const auth = await this.prisma.auth.findFirst({
      where: { userId: submission.promotedUserId },
    });

    if (!auth) {
      throw new NotFoundException(
        'No auth record found for the promoted student',
      );
    }

    const tempPassword = randomBytes(4).toString('hex');

    // Bumping `tokenVersion` only invalidates *access* tokens: jwt-auth.guard
    // compares the embedded version against the current one. `refresh()` never
    // compares it — it re-reads the current value and re-embeds it — so without
    // this deleteMany an old refresh token would still mint a fresh valid pair
    // after the password was reset. `changePassword` revokes for the same
    // reason. Wrapped in a transaction so a failure between the two writes
    // cannot leave a new password with the old sessions still live.
    await this.prisma.$transaction(async (tx) => {
      await tx.auth.update({
        where: { id: auth.id },
        data: {
          password: await hash(tempPassword, 10),
          tokenVersion: { increment: 1 },
        },
      });

      await tx.refreshToken.deleteMany({ where: { authId: auth.authId } });
    });

    await this.sendCredentials(submission, auth.authId, tempPassword);

    return { resent: true, authId: auth.authId };
  }

  async resendOrPromote(submissionId: string) {
    const submission = await this.prisma.enrollmentSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Already promoted means the account exists — promoting again would fail on
    // the unique email. This method previously delegated straight to
    // promoteOne(), so "resend" could never actually resend.
    if (submission.status === 'Promoted' && submission.promotedUserId) {
      return this.resendCredentials(submissionId);
    }

    return this.promoteOne(submissionId);
  }

  async triggerPromotionForDrive(driveId: string) {
    const pending = await this.prisma.enrollmentSubmission.findMany({
      where: { driveId, status: 'Pending' },
    });

    let promoted = 0;
    let failed = 0;
    const errors: { submissionId: string; error: string }[] = [];

    for (const submission of pending) {
      try {
        await this.promoteOne(submission.id);
        promoted++;
      } catch (err) {
        failed++;
        errors.push({ submissionId: submission.id, error: String(err) });
      }
    }

    await this.prisma.enrollmentDrive.update({
      where: { id: driveId },
      data: { status: 'Processed' },
    });

    return { promoted, failed, errors };
  }

  private async createStreamDrive(
    stream: 'Science' | 'Commerce',
    sessions: string[],
    academicYear: { id: string; label: string },
    classId: string,
    className: string,
    closesAt: string,
  ) {
    const sectionResults: { session: string; created: boolean }[] = [];

    for (const displayName of sessions) {
      const sectionSessionKey = buildSectionSessionKey(stream, displayName);

      const existing = await this.prisma.section.findUnique({
        where: {
          classId_session_academicYearId: {
            classId,
            session: sectionSessionKey,
            academicYearId: academicYear.id,
          },
        },
      });

      if (existing) {
        sectionResults.push({ session: displayName, created: false });
        continue;
      }

      await this.prisma.section.create({
        data: {
          name: sectionName(className, sectionSessionKey),
          classId,
          session: sectionSessionKey,
          academicYearId: academicYear.id,
        },
      });
      sectionResults.push({ session: displayName, created: true });
    }

    const combinations = await this.prisma.combination.findMany({
      where: { stream },
    });

    const form = await this.formsService.createForm(
      `${stream} Enrollment - ${academicYear.label}`,
    );

    const requests: forms_v1.Schema$Request[] = [
      this.textQuestion('Full Name'),
      this.textQuestion('Email Address'),
      this.choiceQuestion('Session', sessions),
      this.choiceQuestion(
        'Combination',
        combinations.map((c) => c.name),
      ),
      this.choiceQuestion('Second Language', ['Kannada', 'Hindi', 'Sanskrit']),
    ];

    const batchResult = await this.formsService.addQuestions(
      form.formId!,
      requests,
    );
    const itemIds = this.extractItemIds(batchResult, [
      'name',
      'email',
      'session',
      'combination',
      'language',
    ]);

    const drive = await this.prisma.enrollmentDrive.create({
      data: {
        academicYearId: academicYear.id,
        stream,
        formId: form.formId!,
        opensAt: new Date(),
        closesAt: new Date(closesAt),
        status: 'Open',
        questionMap: itemIds,
      },
    });

    return {
      drive,
      sectionsCreated: sectionResults,
      responderUri: form.responderUri,
    };
  }

  private textQuestion(title: string): forms_v1.Schema$Request {
    return {
      createItem: {
        item: {
          title,
          questionItem: { question: { required: true, textQuestion: {} } },
        },
        location: { index: 0 },
      },
    };
  }

  private choiceQuestion(
    title: string,
    options: string[],
  ): forms_v1.Schema$Request {
    return {
      createItem: {
        item: {
          title,
          questionItem: {
            question: {
              required: true,
              choiceQuestion: {
                type: 'DROP_DOWN',
                options: options.map((value) => ({ value })),
              },
            },
          },
        },
        location: { index: 0 },
      },
    };
  }

  private extractItemIds(
    batchResult: { data: forms_v1.Schema$BatchUpdateFormResponse },
    order: string[],
  ): Record<string, string> {
    const replies = batchResult.data.replies ?? [];
    const map: Record<string, string> = {};

    replies.forEach((reply, idx) => {
      const itemId = reply.createItem?.itemId;
      if (itemId && order[idx]) {
        map[order[idx]] = itemId;
      }
    });

    return map;
  }

  private async generateAuthId(
    tx: Prisma.TransactionClient,
    params: {
      puYear: string;
      stream: 'Science' | 'Commerce';
      comboIdCode: string;
      joinYear: number;
      language: 'Kannada' | 'Hindi' | 'Sanskrit';
      session: string;
    },
  ): Promise<string> {
    const streamCode = STREAM_CODE[params.stream];
    const comboCode = COMBO_CODE[params.comboIdCode];
    const joinYear2 = params.joinYear.toString().slice(-2);
    const langCode = LANG_CODE[params.language];
    // Same helper OnboardingService uses, so both id-building paths agree on the
    // segment's width. Previously this trusted a caller-supplied value while the
    // other path derived it from Section.session.
    const sessionCode = authIdSessionSegment(params.session);

    if (!comboCode) {
      throw new BadRequestException(
        `No authId code mapping for combination "${params.comboIdCode}"`,
      );
    }

    const bucketKey = `nnpu-${params.puYear}-${streamCode}-${comboCode}-${joinYear2}-${langCode}-${sessionCode}`;

    const seq = await tx.idSequence.upsert({
      where: { id: bucketKey },
      create: { id: bucketKey, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });

    const serial = String(seq.lastValue).padStart(3, '0');

    return `nnpu${params.puYear}${streamCode}${comboCode}${joinYear2}${langCode}${sessionCode}${serial}`;
  }
}
