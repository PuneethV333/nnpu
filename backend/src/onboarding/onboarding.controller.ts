import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

import { OnboardingService } from './onboarding.service';
import { CreateSchool } from './dto/create-school.dto';

import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { RolesGuard } from '@/auth/guard/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CreateStudentDto } from './dto/create-student.dto';

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
}
