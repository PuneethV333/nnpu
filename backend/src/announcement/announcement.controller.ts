import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { AnnouncementDto } from './dto/announcement-Query.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import type { JwtPayload } from '@/auth/types/jwt-payload.type';

@Controller('announcement')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get('latest')
  @UseGuards(JwtAuthGuard)
  findLatest(@CurrentUser() user: JwtPayload) {
    return this.announcementService.findLatest(user.authId);
  }

  // NOTE: `all` MUST stay declared above `:id`. Nest matches routes in
  // declaration order, so a literal `@Get(':id')` first would swallow
  // `/announcement/all` with id="all" and 404/throw instead of listing.
  @Get('all')
  @UseGuards(JwtAuthGuard)
  findAll(@Query() query: AnnouncementDto, @CurrentUser() user: JwtPayload) {
    return this.announcementService.findAll(query, user.authId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.announcementService.details(id, user.authId);
  }
}
