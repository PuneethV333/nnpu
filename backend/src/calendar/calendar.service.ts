import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { GenerateCalendarDto } from './dto/generate-calendar.dto';
import { DayType } from '@/generated/prisma';

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async generateYear(dto: GenerateCalendarDto) {
    this.logger.log('[generate-year]');
    const overrideMap = new Map(
      dto.overrides.map((o) => [
        new Date(o.date).toISOString().split('T')[0],
        o,
      ]),
    );
    const start = new Date(Date.UTC(dto.year, 0, 1));
    const end = new Date(Date.UTC(dto.year, 11, 31));

    const days: { date: Date; type: DayType; label: string | null }[] = [];

    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;

      const override = overrideMap.get(key);

      days.push({
        date: new Date(d),
        type: override?.type ?? (isWeekend ? 'Weekend' : 'Working'),
        label: override?.label ?? null,
      });
    }

    await this.prisma.$transaction(
      days.map((day) =>
        this.prisma.academicCalendarDay.upsert({
          where: { date: day.date },
          update: { type: day.type, label: day.label },
          create: day,
        }),
      ),
    );

    return {
      message: `Calendar generated for ${dto.year}`,
      totalDays: days.length,
    };
  }

  async getRange(from: string, to: string) {
    this.logger.log('[get-range]');
    return this.prisma.academicCalendarDay.findMany({
      where: {
        date: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async overrideDay(date: string, type: DayType, label?: string) {
    this.logger.log('[override-day]');
    return this.prisma.academicCalendarDay.upsert({
      where: { date: new Date(date) },
      update: { type, label: label ?? null },
      create: { date: new Date(date), type, label: label ?? null },
    });
  }
}
