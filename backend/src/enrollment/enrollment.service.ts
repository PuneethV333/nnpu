/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';
import { GoogleFormsService } from '@/google/google-forms.service';
import { MailService } from '@/mail/mail.service';
import { CreateDriveDto } from './dto/create-drive.dto';
import { hash } from 'bcrypt';
import { randomBytes } from 'crypto';

const STREAM_CODE: Record<'Science' | 'Commerce', string> = {
  Science: 'SCI',
  Commerce: 'COM',
};

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

    const byStream = dto.sessions.reduce<
      Record<'Science' | 'Commerce', string[]>
    >(
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
      (s) => byStream[s].length > 0,
    );

    const results = await Promise.all(
      streamsToProcess.map((stream) =>
        this.createStreamDrive(
          stream,
          byStream[stream],
          academicYear,
          classRecord.id,
          dto.closesAt,
        ),
      ),
    );

    return Object.fromEntries(
      streamsToProcess.map((stream, i) => [stream.toLowerCase(), results[i]]),
    );
  }

  private async createStreamDrive(
    stream: 'Science' | 'Commerce',
    sessions: string[],
    academicYear: { id: string; label: string },
    classId: string,
    closesAt: string,
  ) {
    const sectionResults: { session: string; created: boolean }[] = [];

    for (const displayName of sessions) {
      // Internal session key is stream-disambiguated (e.g. "SCI-A") so
      // Science and Commerce sessions never collide on the Section's
      // @@unique([classId, session, academicYearId]) constraint — both
      // streams share the same classId ("1") and academicYearId, so the
      // plain display name alone ("A") is NOT unique across streams.
      const sessionKey = `${STREAM_CODE[stream]}-${displayName}`;

      const existing = await this.prisma.section.findUnique({
        where: {
          classId_session_academicYearId: {
            classId,
            session: sessionKey,
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
          name: `1-${sessionKey}`,
          classId,
          session: sessionKey,
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

    const requests = [
      this.textQuestion('Full Name'),
      this.textQuestion('Email Address'),
      // Students see the plain display names ("A", "B") — the stream
      // prefix is purely an internal DB disambiguation detail.
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

  async listDrives() {
    return this.prisma.enrollmentDrive.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDrive(driveId: string) {
    const drive = await this.prisma.enrollmentDrive.findUnique({
      where: { id: driveId },
      include: {
        submissions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!drive) throw new NotFoundException('Drive not found');
    return drive;
  }

  async listSubmissions(driveId: string, status?: string) {
    return this.prisma.enrollmentSubmission.findMany({
      where: { driveId, ...(status ? { status: status as any } : {}) },
      orderBy: { createdAt: 'asc' },
    });
  }

  async promoteOne(submissionId: string) {
    const submission = await this.prisma.enrollmentSubmission.findUniqueOrThrow(
      {
        where: { id: submissionId },
      },
    );

    if (submission.status === 'Promoted') {
      throw new BadRequestException(
        'This submission has already been promoted',
      );
    }

    const drive = await this.prisma.enrollmentDrive.findUniqueOrThrow({
      where: { id: submission.driveId },
    });

    const classRecord = await this.prisma.class.findUniqueOrThrow({
      where: { name: '1' },
    });

    // Reconstruct the same stream-disambiguated session key used at
    // creation time — submission.session holds the plain display name
    // ("A"), submission.stream tells us which stream's "A" this actually is.
    const sessionKey = `${STREAM_CODE[submission.stream]}-${submission.session}`;

    const section = await this.prisma.section.findUnique({
      where: {
        classId_session_academicYearId: {
          classId: classRecord.id,
          session: sessionKey,
          academicYearId: drive.academicYearId,
        },
      },
    });

    if (!section) {
      throw new BadRequestException(
        `No matching section for ${submission.stream} session ${submission.session} in this academic year`,
      );
    }

    const authId = await this.generateAuthId();
    const tempPassword = randomBytes(4).toString('hex');
    const hashedPassword = await hash(tempPassword, 10);

    const user = await this.prisma.$transaction(async (tx) => {
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
        data: { status: 'Promoted', promotedUserId: newUser.id },
      });

      return newUser;
    });

    await this.mail.send({
      to: submission.email,
      subject: 'Your School Portal Login',
      body: `Hi ${submission.name},\n\nYour login details:\nAuth ID: ${authId}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password.`,
    });

    return user;
  }

  async resendOrPromote(submissionId: string) {
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

  private textQuestion(title: string) {
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

  private choiceQuestion(title: string, options: string[]) {
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
    batchResult: any,
    order: string[],
  ): Record<string, string> {
    const replies = batchResult.data.replies ?? [];
    const map: Record<string, string> = {};
    replies.forEach((reply: any, idx: number) => {
      const itemId = reply.createItem?.itemId;
      if (itemId && order[idx]) {
        map[order[idx]] = itemId;
      }
    });
    return map;
  }

  private async generateAuthId(): Promise<string> {
    const seq = await this.prisma.idSequence.upsert({
      where: { id: 'student-auth-id' },
      update: { lastValue: { increment: 1 } },
      create: { id: 'student-auth-id', lastValue: 1 },
    });
    return `STU${seq.lastValue.toString().padStart(5, '0')}`;
  }
}
