import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { RolesGuard } from '@/auth/guard/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import type { JwtPayload } from '@/auth/types/jwt-payload.type';
import { SectionsService } from './sections.service';
import {
  AssignSubjectsDto,
  SectionIdParamDto,
  SetClassTeacherDto,
} from './dto';

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Get(':sectionId/assignments')
  @ApiOperation({
    summary: 'Current class teacher and subject-teacher assignments',
  })
  getAssignments(@Param() params: SectionIdParamDto) {
    return this.sectionsService.getSectionAssignments(params.sectionId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Patch(':sectionId/class-teacher')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: "Assign or clear a section's class teacher",
  })
  @ApiParam({ name: 'sectionId' })
  setClassTeacher(
    @Param() params: SectionIdParamDto,
    @Body() dto: SetClassTeacherDto,
  ) {
    return this.sectionsService.setClassTeacher(params.sectionId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post(':sectionId/subjects')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Assign teachers to subjects in a section (upsert per subject)',
  })
  @ApiParam({ name: 'sectionId' })
  assignSubjects(
    @Param() params: SectionIdParamDto,
    @Body() dto: AssignSubjectsDto,
  ) {
    return this.sectionsService.assignSubjects(params.sectionId, dto);
  }
}
