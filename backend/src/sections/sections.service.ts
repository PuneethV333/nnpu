import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SectionArray } from './types/section.type';

@Injectable()
export class SectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async getMySections(authId: string): Promise<SectionArray> {
    this.logger.log('[sections-mine]');

    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      select: { userId: true },
    });

    if (!auth) {
      throw new UnauthorizedException('User not found');
    }

    const cacheKey = `sections:teacher:${auth.userId}`;
    const cached = await this.redis.get<SectionArray>(cacheKey);
    if (cached) return cached;

    const sections = await this.prisma.section.findMany({
      where: {
        OR: [
          { classTeacherId: auth.userId },
          { subjects: { some: { teacherId: auth.userId } } },
        ],
      },
      include: { class: true, academicYear: true },
      orderBy: [{ class: { name: 'asc' } }, { name: 'asc' }],
    });

    const result: SectionArray = sections.map((s) => ({
      id: s.id,
      name: s.name,
      session: s.session,
      className: s.class.name,
      academicYearLabel: s.academicYear.label,
      isClassTeacher: s.classTeacherId === auth.userId,
    }));

    await this.redis.set<SectionArray>(cacheKey, result, 300);

    return result;
  }

  async getAllSections(): Promise<SectionArray> {
    this.logger.log('[sections-all]');

    const cacheKey = 'sections:all';
    const cached = await this.redis.get<SectionArray>(cacheKey);
    if (cached) return cached;

    const sections = await this.prisma.section.findMany({
      include: { class: true, academicYear: true },
      orderBy: [
        { academicYear: { startDate: 'desc' } },
        { class: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    const result: SectionArray = sections.map((s) => ({
      id: s.id,
      name: s.name,
      session: s.session,
      className: s.class.name,
      academicYearLabel: s.academicYear.label,
      isClassTeacher: false,
    }));

    await this.redis.set<SectionArray>(cacheKey, result, 300);

    return result;
  }
}
