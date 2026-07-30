import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { RolesGuard } from '@/auth/guard/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import type { JwtPayload } from '@/auth/types/jwt-payload.type';
import { SectionsService } from './sections.service';

@ApiTags('sections')
@ApiBearerAuth()
@Controller('sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Teacher')
  @Get('mine')
  @ApiOperation({
    summary:
      'Sections the current teacher can mark attendance for (class-teacher of, or teaches a subject in)',
  })
  getMySections(@CurrentUser() user: JwtPayload) {
    return this.sectionsService.getMySections(user.authId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Teacher', 'Admin')
  @Get()
  @ApiOperation({ summary: 'All sections (Teacher or Admin)' })
  getAllSections() {
    return this.sectionsService.getAllSections();
  }
}
