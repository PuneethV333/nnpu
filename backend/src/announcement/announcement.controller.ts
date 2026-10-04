import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { AnnouncementDto } from './dto/announcement-Query.dto';

@Controller('announcement')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get('latest')
  @UseGuards(JwtAuthGuard)
  findLatest() {
    return this.announcementService.findLatest();
  }

  // NOTE: `all` MUST stay declared above `:id`. Nest matches routes in
  // declaration order, so a literal `@Get(':id')` first would swallow
  // `/announcement/all` with id="all" and 404/throw instead of listing.
  @Get('all')
  @UseGuards(JwtAuthGuard)
  findAll(@Query() query: AnnouncementDto) {
    return this.announcementService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.announcementService.details(id);
  }
}
