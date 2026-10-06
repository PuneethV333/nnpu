import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Section } from '@/generated/prisma';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';
import { sectionName } from '@/common/utils/section-session.util';
import type { PromoteTo2ndPucDto } from './dto/promote-to-2nd-puc.dto';

export interface PromotionSectionResult {
  sourceSectionId: string;
  sourceName: string;
  targetSectionId: string;
  targetName: string;
  /** True when the target section did not exist and was created. */
  targetCreated: boolean;
  studentsToMove: number;
  /** Students left behind in the source section, with the reason. */
  skipped: { name: string; reason: string }[];
}

export interface PromoteTo2ndPucResult {
  dryRun: boolean;
  targetAcademicYearId: string;
  targetAcademicYearLabel: string;
  moved: number;
  sections: PromotionSectionResult[];
}

/** Mutable working state for one source section while the batch is planned. */
interface Plan {
  source: Section & {
    class: { id: string; name: string };
    academicYear: { id: string; label: string };
  };
  movable: { id: string; isActive: boolean }[];
  skipped: { name: string; reason: string }[];
  targetSectionId: string;
  targetName: string;
  targetCreated: boolean;
  studentsToMove: number;
}

@Injectable()
export class PromotionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Moves every active student in the named 1st-PUC sections into the matching
   * 2nd-PUC section of the following academic year.
   *
   * The mapping needs no per-row input because `Section.session` already
   * encodes both the stream and the section label: a student in `SCI-A` goes
   * to `SCI-A` in class 2. `Section` is unique on
   * [classId, session, academicYearId], so no two sources can ever resolve to
   * the same target and no student needs choosing a destination.
   *
   * **authIds are deliberately left untouched.** `nnpu1SB26KA018` freezes as
   * "joined 1st PUC in AY26" — a join record, not a description of the
   * student's current class. That keeps every login in the cohort working
   * across the promotion, avoids re-emailing the batch, and leaves every
   * `idSequence` bucket undisturbed. Nothing parses the structure of an
   * authId, so the frozen digit cannot mislead any code.
   *
   * All-or-nothing: a batch that moved half its students leaves sections no
   * one can reconcile without diffing rosters by hand.
   */
  async promoteTo2ndPuc(
    dto: PromoteTo2ndPucDto,
  ): Promise<PromoteTo2ndPucResult> {
    const requestedIds = dto.sections.map((s) => s.sectionId);

    this.logger.log(
      `[promote-2nd-puc] sections=${requestedIds.length} dryRun=${dto.dryRun === true}`,
    );

    const classTwo = await this.prisma.class.findUnique({
      where: { name: '2' },
    });
    if (!classTwo) {
      throw new BadRequestException(
        'Class "2" does not exist, so there is no destination class to promote into.',
      );
    }

    const sources = await this.prisma.section.findMany({
      where: { id: { in: requestedIds } },
      include: { class: true, academicYear: true },
    });

    if (sources.length !== requestedIds.length) {
      const found = new Set(sources.map((s) => s.id));
      const missing = requestedIds.filter((id) => !found.has(id));
      throw new NotFoundException(
        `Section(s) not found: ${missing.join(', ')}`,
      );
    }

    const notFirstPuc = sources.filter((s) => s.class.name !== '1');
    if (notFirstPuc.length > 0) {
      throw new BadRequestException(
        `Only 1st-PUC sections can be promoted. Rejected: ${notFirstPuc
          .map((s) => `${s.name} (class ${s.class.name})`)
          .join(', ')}`,
      );
    }

    const yearIds = new Set(sources.map((s) => s.academicYearId));
    if (yearIds.size > 1) {
      throw new BadRequestException(
        'All source sections must share one academic year, or there is no single year to promote into. These span: ' +
          [...new Set(sources.map((s) => s.academicYear.label))].join(', '),
      );
    }

    const sourceYear = sources[0].academicYear;

    // Resolved before the students are read, but AFTER the dry-run branch
    // below decides whether creating it is allowed. `resolveTargetYear` only
    // creates when it is told to; a dry run asks it not to, so a preview leaves
    // no trace in the database.
    const targetYear = await this.resolveTargetYear(
      sourceYear,
      dto.targetAcademicYearId,
      dto.dryRun !== true,
    );

    const students = await this.prisma.user.findMany({
      where: { sectionId: { in: requestedIds } },
      include: { details: true },
      orderBy: { id: 'asc' },
    });

    const plans: Plan[] = sources.map((source) => {
      const inSection = students.filter((u) => u.sectionId === source.id);

      return {
        source,
        // A deactivated account is deliberately left behind. Moving it would
        // put a dormant login in a new class, and the admin who deactivated it
        // may have done so precisely because the student is no longer there.
        movable: inSection.filter((u) => u.isActive),
        skipped: inSection
          .filter((u) => !u.isActive)
          .map((u) => ({
            name: u.details?.name ?? u.id,
            reason: 'account is deactivated, so it stays in 1st PUC',
          })),
        targetSectionId: '',
        targetName: sectionName('2', source.session),
        targetCreated: false,
        studentsToMove: inSection.filter((u) => u.isActive).length,
      };
    });

    const movableIds = plans.flatMap((p) => p.movable.map((u) => u.id));

    if (dto.dryRun) {
      // Read-only resolution, so the preview names real ids where the target
      // already exists and says it would be created where it does not.
      for (const plan of plans) {
        const existing = await this.findTargetSection(
          classTwo.id,
          plan.source.session,
          targetYear.id,
        );
        plan.targetSectionId = existing?.id ?? '(would be created)';
        plan.targetCreated = !existing;
      }

      return this.toResult(true, targetYear, 0, plans);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const plan of plans) {
        let target = await this.findTargetSection(
          classTwo.id,
          plan.source.session,
          targetYear.id,
          tx,
        );

        if (!target) {
          target = await tx.section.create({
            data: {
              name: plan.targetName,
              classId: classTwo.id,
              // Same session key, so class 2's `SCI-A` is `SCI-A`. The unique
              // constraint above is what stops two sources writing into one
              // target.
              session: plan.source.session,
              academicYearId: targetYear.id,
            },
          });
          plan.targetCreated = true;
        }

        plan.targetSectionId = target.id;

        if (plan.movable.length === 0) continue;

        // Scoped to the source section as well as the id list, so a student
        // imported into a *different* section between this read and this write
        // cannot be swept up by a stale id list.
        await tx.user.updateMany({
          where: {
            id: { in: plan.movable.map((u) => u.id) },
            sectionId: plan.source.id,
          },
          data: { sectionId: target.id },
        });
      }
    });

    this.logger.log(
      `[promote-2nd-puc] moved ${movableIds.length} student(s) into ${targetYear.label}`,
    );

    return this.toResult(false, targetYear, movableIds.length, plans);
  }

  private toResult(
    dryRun: boolean,
    targetYear: { id: string; label: string },
    moved: number,
    plans: Plan[],
  ): PromoteTo2ndPucResult {
    return {
      dryRun,
      targetAcademicYearId: targetYear.id,
      targetAcademicYearLabel: targetYear.label,
      moved,
      sections: plans.map((p) => ({
        sourceSectionId: p.source.id,
        sourceName: p.source.name,
        targetSectionId: p.targetSectionId,
        targetName: p.targetName,
        targetCreated: p.targetCreated,
        studentsToMove: p.studentsToMove,
        skipped: p.skipped,
      })),
    };
  }

  /**
   * The academic year to promote into.
   *
   * `allowCreate` is false on a dry run. The year is still *resolved* so the
   * preview can name its label, but a missing one is reported in the response
   * rather than written — a preview that mutates the database is worse than no
   * preview, because the operator reasonably believes nothing happened.
   */
  private async resolveTargetYear(
    source: {
      id: string;
      label: string;
      startDate: Date;
      endDate: Date;
    },
    targetAcademicYearId: string | undefined,
    allowCreate: boolean,
  ): Promise<{ id: string; label: string }> {
    if (targetAcademicYearId) {
      const year = await this.prisma.academicYear.findUnique({
        where: { id: targetAcademicYearId },
      });
      if (!year) {
        throw new NotFoundException(
          `Academic year "${targetAcademicYearId}" not found`,
        );
      }
      return year;
    }

    const derived = deriveNextAcademicYear(source);

    const existing = await this.prisma.academicYear.findFirst({
      where: {
        OR: [{ label: derived.label }, { startDate: derived.startDate }],
      },
    });
    if (existing) return existing;

    if (!allowCreate) {
      // Reported, not created, so the caller can see what a real run would do.
      return { id: '(would be created)', label: derived.label };
    }

    this.logger.log(
      `[promote-2nd-puc] creating academic year ${derived.label}`,
    );

    return this.prisma.academicYear.create({ data: derived });
  }

  private findTargetSection(
    classId: string,
    session: string,
    academicYearId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.section.findUnique({
      where: {
        classId_session_academicYearId: { classId, session, academicYearId },
      },
    });
  }
}

/**
 * The academic year following `source`, derived by shifting its own dates a
 * year.
 *
 * Derived rather than hardcoded so the destination inherits whatever span the
 * school actually uses — the seed is June–March, but a school running
 * April–March keeps its own dates — instead of this endpoint asserting a
 * calendar of its own.
 *
 * A pure function, deliberately: it is also what a dry run uses to name the
 * year it would create without touching the database.
 */
export const deriveNextAcademicYear = (source: {
  startDate: Date;
  endDate: Date;
}): { label: string; startDate: Date; endDate: Date } => {
  const startDate = new Date(source.startDate);
  startDate.setFullYear(startDate.getFullYear() + 1);
  const endDate = new Date(source.endDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  return {
    label: `${startDate.getFullYear()}-${String(endDate.getFullYear()).slice(-2)}`,
    startDate,
    endDate,
  };
};
