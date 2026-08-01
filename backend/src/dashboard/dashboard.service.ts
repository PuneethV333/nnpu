import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { AdminDashboard } from './types/dashboard.type';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async getAdminDashboard(): Promise<AdminDashboard> {
    this.logger.log('[dashboard-admin]');

    const cacheKey = 'dashboard:admin';
    const cached = await this.redis.get<AdminDashboard>(cacheKey);
    if (cached) return cached;

    // UTC-safe "today" — matches how @db.Date columns are stored/compared
    // everywhere else (new Date('YYYY-MM-DD') parses as UTC midnight).
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const [
      calendarDay,
      totalStudents,
      markedToday,
      pendingEnrollments,
      openDrives,
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
      this.prisma.enrollmentSubmission.count({
        where: { status: 'Pending' },
      }),
      this.prisma.enrollmentDrive.count({
        where: { status: 'Open' },
      }),
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
        date: today.toISOString().slice(0, 10),
        type: calendarDay?.type ?? null,
        label: calendarDay?.label ?? null,
      },
      attendanceToday: {
        totalStudents,
        marked: markedToday,
        percentage,
      },
      pendingEnrollments,
      openDrives,
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
