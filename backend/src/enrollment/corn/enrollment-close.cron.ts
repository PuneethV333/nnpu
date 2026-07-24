import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';
import { GoogleFormsService } from '@/google/google-forms.service';
import {
  QuestionMap,
  ParsedResponse,
} from '@/enrollment/types/enrollment.types';

@Injectable()
export class EnrollmentCloseCron {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly formsService: GoogleFormsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async run() {
    this.logger.log('[enrollment-close-cron] checking for drives to close');

    const drivesToProcess = await this.prisma.enrollmentDrive.findMany({
      where: {
        status: 'Open',
        closesAt: { lte: new Date() },
      },
    });

    for (const drive of drivesToProcess) {
      await this.processDrive(drive.id);
    }
  }

  async processDrive(driveId: string) {
    this.logger.log(`[enrollment-close-cron] processing drive ${driveId}`);

    const drive = await this.prisma.enrollmentDrive.findUniqueOrThrow({
      where: { id: driveId },
    });

    const questionMap = drive.questionMap as unknown as QuestionMap;

    const combinations = await this.prisma.combination.findMany({
      where: { stream: drive.stream },
    });
    const combinationByName = new Map(combinations.map((c) => [c.name, c.id]));

    const responses = await this.formsService.listResponses(drive.formId);

    const validResponses = responses.filter((r) => {
      const ts = r.lastSubmittedTime ?? r.createTime;
      if (!ts) return false;
      const submittedAt = new Date(ts);
      return submittedAt <= drive.closesAt;
    });

    let staged = 0;
    let skipped = 0;

    for (const response of validResponses) {
      const parsed = this.parseResponse(
        response,
        questionMap,
        combinationByName,
      );
      if (!parsed) {
        skipped++;
        continue;
      }

      const existing = await this.prisma.enrollmentSubmission.findFirst({
        where: { driveId, email: parsed.email },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await this.prisma.enrollmentSubmission.create({
        data: {
          driveId,
          name: parsed.name,
          email: parsed.email,
          stream: drive.stream,
          session: parsed.session,
          combinationId: parsed.combinationId,
          language: parsed.language,
          submittedAt: parsed.submittedAt,
        },
      });

      staged++;
    }

    await this.prisma.enrollmentDrive.update({
      where: { id: driveId },
      data: { status: 'Closed' },
    });

    this.logger.log(
      `[enrollment-close-cron] drive ${driveId}: staged ${staged}, skipped ${skipped}`,
    );
  }

  private parseResponse(
    response: unknown,
    questionMap: QuestionMap,
    combinationByName: Map<string, string>,
  ): ParsedResponse | null {
    type FormAnswer = {
      textAnswers?: {
        answers?: Array<{ value?: string }>;
      };
    };

    type GoogleFormsResponse = {
      answers?: Record<string, FormAnswer>;
      lastSubmittedTime?: string;
      createTime?: string;
    };

    const isGoogleFormsResponse = (
      value: unknown,
    ): value is GoogleFormsResponse => {
      return (
        typeof value === 'object' &&
        value !== null &&
        ('answers' in value ||
          'lastSubmittedTime' in value ||
          'createTime' in value)
      );
    };

    if (!isGoogleFormsResponse(response)) {
      return null;
    }

    try {
      const answers = response.answers ?? {};

      const getAnswer = (itemId: string): string | undefined =>
        answers[itemId]?.textAnswers?.answers?.[0]?.value;

      const name = getAnswer(questionMap.name);
      const email = getAnswer(questionMap.email);
      const session = getAnswer(questionMap.session);
      const combinationName = getAnswer(questionMap.combination);
      const languageRaw = getAnswer(questionMap.language);

      if (!name || !email || !session) {
        return null;
      }

      const combinationId = combinationName
        ? (combinationByName.get(combinationName) ?? null)
        : null;

      if (combinationName && !combinationId) {
        return null;
      }

      const submittedAt = new Date(
        (response.lastSubmittedTime ?? response.createTime) as string,
      );

      return {
        name,
        email,
        session,
        combinationId,
        language: (languageRaw as 'Hindi' | 'Kannada' | 'Sanskrit') ?? null,
        submittedAt,
      };
    } catch {
      return null;
    }
  }
}
