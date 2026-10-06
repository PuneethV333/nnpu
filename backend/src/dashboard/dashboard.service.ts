import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { AdminDashboard } from './types/dashboard.type';
import { toDayKey, zonedToday } from '@/common/utils/date.util';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async getAdminDashboard(): Promise<AdminDashboard> {
    this.logger.log('[dashboard-admin]');

    // The school day, not the UTC day. This file used to build "today" from
    // `new Date()` truncated to UTC midnight, which is only correct while UTC
    // and IST share a date. IST is UTC+5:30, so between 00:00 and 05:30 local
    // time the UTC date is still the previous one and the dashboard rendered
    // yesterday's attendance, calendar day and upcoming events.
    const today = zonedToday();

    // The day is part of the key so the rollover is immediate. Without it the
    // 300s TTL would keep serving the previous school day's figures for up to
    // five minutes after local midnight.
    const cacheKey = `dashboard:admin:${toDayKey(today)}`;
    const cached = await this.redis.get<AdminDashboard>(cacheKey);
    if (cached) return cached;

    const [
      calendarDay,
      totalStudents,
      markedToday,
      totalTeachers,
      pendingInvoiceCount,
      feeAggregate,
      upcomingEvents,
    ] = await Promise.all([
      this.prisma.academicCalendarDay.findUnique({
        where: { date: today },
      }),
      this.prisma.user.count({
        where: { role: 'Student', isActive: true, sectionId: { not: null } },
      }),
      this.prisma.attendance.count({
        where: { date: today, status: { not: 'NotMarked' } },
      }),
      // Counted live rather than read off a stat table, so it cannot drift.
      // Replaces the old `pendingEnrollments` / `openDrives` pair, which both
      // counted rows in the Google Forms drive tables — with CSV imports there
      // is no equivalent "work waiting" state, because an import either lands
      // whole or not at all.
      this.prisma.user.count({ where: { role: 'Teacher', isActive: true } }),
      this.prisma.invoice.count({
        where: { status: { not: 'Paid' } },
      }),
      this.prisma.invoice.aggregate({
        where: { status: { not: 'Paid' } },
        _sum: { totalAmount: true, paidAmount: true },
      }),
      this.prisma.academicCalendarDay.findMany({
        where: { date: { gt: today }, type: { not: 'Working' } },
        orderBy: { date: 'asc' },
        take: 5,
      }),
    ]);

    const amountPending =
      (feeAggregate._sum.totalAmount ?? 0) -
      (feeAggregate._sum.paidAmount ?? 0);

    const percentage =
      totalStudents > 0
        ? Number(((markedToday / totalStudents) * 100).toFixed(2))
        : 0;

    const dashboard: AdminDashboard = {
      today: {
        date: toDayKey(today),
        type: calendarDay?.type ?? null,
        label: calendarDay?.label ?? null,
      },
      attendanceToday: {
        totalStudents,
        marked: markedToday,
        percentage,
      },
      totalTeachers,
      fees: {
        pendingInvoices: pendingInvoiceCount,
        amountPending,
      },
      upcomingEvents: upcomingEvents.map((d) => ({
        date: d.date,
        type: d.type,
        label: d.label,
      })),
    };

    await this.redis.set<AdminDashboard>(cacheKey, dashboard, 300);

    return dashboard;
  }
}
