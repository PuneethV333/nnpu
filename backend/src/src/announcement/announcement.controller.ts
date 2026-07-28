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

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.announcementService.details(id);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  findAll(@Query() query: AnnouncementDto) {
    return this.announcementService.findAll(query);
  }
}
