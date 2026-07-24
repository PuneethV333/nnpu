import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AnnouncementDto } from './dto/announcement-Query.dto';
import { latest } from './type/announcement.type';

@Injectable()
export class AnnouncementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  // private async resolveUser(
  //   authId: string,
  // ): Promise<{ userId: string; role: Role }> {
  //   const auth = await this.prisma.auth.findUnique({
  //     where: { authId },
  //     select: { userId: true, user: { select: { role: true } } },
  //   });

  //   if (!auth) {
  //     throw new UnauthorizedException('user not found');
  //   }

  //   return { userId: auth.userId, role: auth.user.role };
  // }

  async findLatest() {
    const announcements = await this.prisma.announcement.findMany({
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      include: {
        author: {
          include: {
            details: {
              select: {
                name: true,
                profilePic: true,
              },
            },
          },
        },
      },
    });

    const result: latest[] = announcements.map((announcement) => {
      return {
        name: announcement.author.details?.name ?? '',
        profilePic: announcement.author.details?.profilePic ?? '',
        title: announcement.title,
        body: announcement.body,
        type: announcement.type,
        id: announcement.id,
      };
    });

    return result;
  }

  async findAll(dto: AnnouncementDto) {
    const { page, pageSize } = dto;

    const announcements = await this.prisma.announcement.findMany({
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: {
          include: {
            details: {
              select: {
                name: true,
                profilePic: true,
              },
            },
          },
        },
      },
    });

    const result: latest[] = announcements.map((announcement) => {
      return {
        name: announcement.author.details?.name ?? '',
        profilePic: announcement.author.details?.profilePic ?? '',
        title: announcement.title,
        body: announcement.body,
        type: announcement.type,
        id: announcement.id,
      };
    });

    return { data: result, page, pageSize };
  }

  async details(id: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        author: {
          include: {
            details: {
              select: {
                name: true,
                profilePic: true,
              },
            },
          },
        },
      },
    });

    if (!announcement) {
      throw new BadRequestException('Announcement not found');
    }

    const result: latest = {
      name: announcement.author.details?.name ?? '',
      profilePic: announcement.author.details?.profilePic ?? '',
      title: announcement.title,
      body: announcement.body,
      type: announcement.type,
      id: announcement.id,
    };

    return result;
  }

  //todo : create,update,delete
}
