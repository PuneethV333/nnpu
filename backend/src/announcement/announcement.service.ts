import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { AnnouncementDto } from './dto/announcement-Query.dto';
import { latest } from './type/announcement.type';
import { RedisService } from '@/redis/redis.service';

type Audience = {
  schoolId: string | null;
  /** `null` means "no section restriction" (Admin). An empty array means the
   *  caller belongs to no section, so only school-wide posts are visible. */
  sectionIds: string[] | null;
};

@Injectable()
export class AnnouncementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Which announcements the caller is allowed to see.
   *
   * `Announcement.schoolId` / `sectionId` existed but no read path used them, so
   * every authenticated user received every announcement in the school —
   * including ones deliberately targeted at a single section.
   *
   * Note `User.sectionId` is only populated for students; a teacher belongs to
   * sections through `SectionSubject`, so their visibility is derived from their
   * teaching assignments rather than their (null) own section.
   */
  private async resolveAudience(authId: string): Promise<Audience> {
    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      select: {
        userId: true,
        user: { select: { role: true, schoolId: true, sectionId: true } },
      },
    });

    if (!auth) {
      throw new UnauthorizedException('user not found');
    }

    const { role, schoolId, sectionId } = auth.user;

    // An Admin manages the whole school, so section-targeted posts are theirs to
    // read too. Everyone else is limited to their own sections.
    if (role === 'Admin') {
      return { schoolId, sectionIds: null };
    }

    if (role === 'Teacher') {
      const assignments = await this.prisma.sectionSubject.findMany({
        where: { teacherId: auth.userId },
        select: { sectionId: true },
      });

      return { schoolId, sectionIds: assignments.map((a) => a.sectionId) };
    }

    return { schoolId, sectionIds: sectionId ? [sectionId] : [] };
  }

  /**
   * `schoolId: null` is a genuinely global post, visible to everyone including
   * users not yet assigned to a school. Otherwise the post must belong to the
   * caller's own school.
   */
  private audienceWhere(audience: Audience): Record<string, unknown> {
    const schoolClause =
      audience.schoolId === null
        ? { schoolId: null }
        : { OR: [{ schoolId: null }, { schoolId: audience.schoolId }] };

    // Admin: no section restriction at all.
    if (audience.sectionIds === null) {
      return schoolClause;
    }

    const sectionClause = {
      OR: [{ sectionId: null }, { sectionId: { in: audience.sectionIds } }],
    };

    return { AND: [schoolClause, sectionClause] };
  }

  /**
   * Cache keys must include the audience.
   *
   * They used to be a bare `announcements:latest` / `announcement:{page}:{size}`,
   * shared by every caller. Filtering the query alone would therefore have been
   * useless: the first user's filtered page would have been served to the rest
   * from Redis. Hashed to keep the key bounded — a teacher may belong to many
   * sections.
   */
  private audienceCacheTag(audience: Audience): string {
    const sections =
      audience.sectionIds === null
        ? 'all'
        : [...audience.sectionIds].sort().join(',') || 'none';

    return createHash('sha1')
      .update(`${audience.schoolId ?? 'none'}|${sections}`)
      .digest('hex')
      .slice(0, 16);
  }

  private toLatest(
    announcements: {
      id: string;
      title: string;
      body: string;
      type: latest['type'];
      author: { details?: { name: string; profilePic: string } | null };
    }[],
  ): latest[] {
    return announcements.map((announcement) => ({
      name: announcement.author.details?.name ?? '',
      profilePic: announcement.author.details?.profilePic ?? '',
      title: announcement.title,
      body: announcement.body,
      type: announcement.type,
      id: announcement.id,
    }));
  }

  private readonly authorInclude = {
    author: {
      include: {
        details: { select: { name: true, profilePic: true } },
      },
    },
  } as const;

  async findLatest(authId: string) {
    this.logger.log('[find-latest]');

    const audience = await this.resolveAudience(authId);
    const cacheKey = `announcements:latest:${this.audienceCacheTag(audience)}`;

    const cached = await this.redis.get<latest[]>(cacheKey);
    if (cached) {
      return { data: cached, source: 'redis' };
    }

    const announcements = await this.prisma.announcement.findMany({
      where: this.audienceWhere(audience),
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      include: this.authorInclude,
    });

    const result = this.toLatest(announcements);

    await this.redis.set<latest[]>(cacheKey, result);

    return { data: result, source: 'db' };
  }

  async findAll(dto: AnnouncementDto, authId: string) {
    const { page, pageSize } = dto;

    const audience = await this.resolveAudience(authId);
    const cacheKey = `announcement:${page}:${pageSize}:${this.audienceCacheTag(audience)}`;

    const cached = await this.redis.get<latest[]>(cacheKey);
    if (cached) {
      return { data: cached, source: 'redis' };
    }

    const announcements = await this.prisma.announcement.findMany({
      where: this.audienceWhere(audience),
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: this.authorInclude,
    });

    const result = this.toLatest(announcements);

    await this.redis.set<latest[]>(cacheKey, result);

    return { data: result, source: 'db' };
  }

  async details(id: string, authId: string) {
    this.logger.log('[announcement-details]');

    const audience = await this.resolveAudience(authId);
    const cacheKey = `announcement:details:${id}:${this.audienceCacheTag(audience)}`;

    const cached = await this.redis.get<latest>(cacheKey);
    if (cached) {
      return { data: cached, source: 'redis' };
    }

    // Scoped lookup rather than findUnique + check, so an announcement outside
    // the caller's audience is reported as missing instead of confirming that
    // it exists.
    const announcement = await this.prisma.announcement.findFirst({
      where: { AND: [{ id }, this.audienceWhere(audience)] },
      include: this.authorInclude,
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    const result = this.toLatest([announcement])[0];

    await this.redis.set<latest>(cacheKey, result);

    return { data: result, source: 'db' };
  }

  //todo : create,update,delete
}
