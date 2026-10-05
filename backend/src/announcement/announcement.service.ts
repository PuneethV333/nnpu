import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { AnnouncementDto } from './dto/announcement-Query.dto';
import {
  AnnouncementAudience,
  CreateAnnouncementDto,
} from './dto/create-announcement.dto';
import type { UpdateAnnouncementDto } from './dto/update-announcement.dto';
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

  /**
   * Resolves who may edit or delete an announcement.
   *
   * An author may always change their own post. Otherwise an Admin may act
   * within their own school: a post scoped to another school must not be
   * reachable, or one school's admin could rewrite another school's notices.
   * `schoolId: null` is a deliberately global post (the read filter treats it
   * as visible to everyone), so any Admin may curate those.
   */
  private async assertCanManage(
    announcementId: string,
    authId: string,
  ): Promise<{ authorId: string; schoolId: string | null }> {
    const [auth, announcement] = await Promise.all([
      this.prisma.auth.findUnique({
        where: { authId },
        select: {
          userId: true,
          user: { select: { role: true, schoolId: true } },
        },
      }),
      this.prisma.announcement.findUnique({
        where: { id: announcementId },
        select: { authorId: true, schoolId: true },
      }),
    ]);

    if (!auth) {
      throw new UnauthorizedException('User not found');
    }

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    if (announcement.authorId === auth.userId) {
      return announcement;
    }

    if (auth.user.role !== 'Admin') {
      throw new ForbiddenException(
        'You can only manage announcements you authored',
      );
    }

    if (
      announcement.schoolId !== null &&
      announcement.schoolId !== auth.user.schoolId
    ) {
      throw new ForbiddenException(
        'This announcement belongs to another school',
      );
    }

    return announcement;
  }

  /**
   * Resolves the audience to the (schoolId, sectionId) pair the read filter
   * understands. Global is schoolId=null AND sectionId=null — a post with a
   * school but no section is school-wide, and one with neither is global.
   */
  private async resolveTarget(
    authId: string,
    audience: AnnouncementAudience,
    sectionId: string | undefined,
  ): Promise<{ schoolId: string | null; sectionId: string | null }> {
    if (audience === AnnouncementAudience.Global) {
      return { schoolId: null, sectionId: null };
    }

    if (audience === AnnouncementAudience.Section) {
      if (!sectionId) {
        throw new BadRequestException(
          'sectionId is required when audience is Section',
        );
      }

      const section = await this.prisma.section.findUnique({
        where: { id: sectionId },
        select: { id: true },
      });

      if (!section) {
        throw new NotFoundException(`Section ${sectionId} not found`);
      }

      // `schoolId` stays null for a section-scoped post, which is what the read
      // filter needs: it ORs on `sectionId: null` for school-wide posts and on
      // `sectionId: { in: [...] }` otherwise, so a null schoolId does not widen
      // who *sees* a section post.
      //
      // Note: neither `Section` nor `Class` carries a schoolId (only `User`
      // does), so a section cannot be verified as belonging to the author's
      // school. Immaterial for a single-school deployment, but it is why no
      // cross-school check is possible here.
      return { schoolId: null, sectionId };
    }

    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      select: { user: { select: { schoolId: true } } },
    });

    return { schoolId: auth?.user.schoolId ?? null, sectionId: null };
  }

  /**
   * Drops every cached read.
   *
   * Read keys are audience-scoped (`announcements:latest:<tag>` and
   * `announcement:<page>:<pageSize>:<tag>`), so the tag varies per audience and
   * a single known key cannot be invalidated. Pattern-delete both families.
   * `announcement*` is used rather than `announcement:*` because that pattern
   * would not match `announcements:latest:...`.
   */
  private async invalidateReads(): Promise<void> {
    try {
      await this.redis.delPattern('announcements:*');
      await this.redis.delPattern('announcement:*');
    } catch (err) {
      this.logger.warn(
        `[announcement] cache invalidation failed: ${String(err)}`,
      );
    }
  }

  async create(authId: string, dto: CreateAnnouncementDto) {
    this.logger.log('[create]');

    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      select: { userId: true },
    });

    if (!auth) {
      throw new UnauthorizedException('User not found');
    }

    const target = await this.resolveTarget(
      authId,
      dto.audience,
      dto.sectionId,
    );

    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        body: dto.body,
        type: dto.type,
        isPinned: dto.isPinned ?? false,
        authorId: auth.userId,
        schoolId: target.schoolId,
        sectionId: target.sectionId,
      },
      include: this.authorInclude,
    });

    await this.invalidateReads();

    return this.toLatest([announcement])[0];
  }

  async update(authId: string, id: string, dto: UpdateAnnouncementDto) {
    this.logger.log('[update]');

    await this.assertCanManage(id, authId);

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data['title'] = dto.title;
    if (dto.body !== undefined) data['body'] = dto.body;
    if (dto.type !== undefined) data['type'] = dto.type;
    if (dto.isPinned !== undefined) data['isPinned'] = dto.isPinned;

    // Only retarget when the audience is explicitly being changed, so an
    // unrelated title edit cannot silently re-scope the post.
    if (dto.audience !== undefined) {
      const target = await this.resolveTarget(
        authId,
        dto.audience,
        dto.sectionId,
      );
      data['schoolId'] = target.schoolId;
      data['sectionId'] = target.sectionId;
    } else if (dto.sectionId !== undefined) {
      throw new BadRequestException(
        'sectionId can only be changed together with audience',
      );
    }

    const announcement = await this.prisma.announcement.update({
      where: { id },
      data,
      include: this.authorInclude,
    });

    await this.invalidateReads();

    return this.toLatest([announcement])[0];
  }

  async remove(authId: string, id: string) {
    this.logger.log('[remove]');

    await this.assertCanManage(id, authId);

    await this.prisma.announcement.delete({ where: { id } });

    await this.invalidateReads();

    return { deleted: true, id };
  }
}
