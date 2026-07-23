import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

import { OnboardingService } from './onboarding.service';
import { CreateSchool } from './dto/create-school.dto';

import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { RolesGuard } from '@/auth/guard/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CreateStudentDto } from './dto/create-student.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { CreateSectionsBulkDto } from './dto/create-sections-bulk.dto';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post('create-school')
  @ApiOperation({
    summary: 'Creates a school (only the name is required)',
  })
  createSchool(@Body() dto: CreateSchool) {
    return this.onboardingService.createSchool(dto.name);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post('create-student')
  @ApiOperation({
    summary: 'Creates a student',
  })
  createStudent(@Body() dto: CreateStudentDto) {
    return this.onboardingService.createStudent(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post('create-teacher')
  @ApiOperation({
    summary: 'Creates a teacher',
  })
  createTeacher(@Body() dto: CreateTeacherDto) {
    return this.onboardingService.createTeacher(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post('create-sections-bulk')
  @ApiOperation({
    summary: 'Creates multiple sections at once for a class + academic year',
  })
  createSectionsBulk(@Body() dto: CreateSectionsBulkDto) {
    return this.onboardingService.createSectionsBulk(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post('create-admin')
  @ApiOperation({
    summary: 'Creates an admin',
  })
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.onboardingService.createAdmin(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post('create-academic-year')
  @ApiOperation({
    summary: 'Creates an academic year',
  })
  createAcademicYear(@Body() dto: CreateAcademicYearDto) {
    return this.onboardingService.createAcademicYear(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post('create-section')
  @ApiOperation({
    summary:
      'Creates a section (session) for a class + combination + language + academic year',
  })
  createSection(@Body() dto: CreateSectionDto) {
    return this.onboardingService.createSection(dto);
  }
}
