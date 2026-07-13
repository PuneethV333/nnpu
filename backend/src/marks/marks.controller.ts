import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MarksService } from './marks.service';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { RolesGuard } from '@/auth/guard/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { ApiOperation } from '@nestjs/swagger';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import type { JwtPayload } from '@/auth/types/jwt-payload.type';
import { EnterMarksDto } from './dto/enter-marks.dto';

@Controller('marks')
export class MarksController {
  constructor(private readonly marksService: MarksService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Teacher', 'Admin')
  @Post('assessment')
  @ApiOperation({
    summary: 'Create an assessment (Unit Test, Mid Term, Final, Internal)',
  })
  createAssessment(
    @Body() dto: CreateAssessmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.marksService.createAssessment(dto, user.authId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('assessment')
  @ApiOperation({
    summary: 'List assessments for a section (optionally filtered by subject)',
  })
  listAssessments(
    @Query('sectionId') sectionId: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.marksService.listAssessments(sectionId, subjectId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Teacher', 'Admin')
  @Post('enter')
  @ApiOperation({ summary: 'Bulk enter/update marks for an assessment' })
  enterMarks(@Body() dto: EnterMarksDto, @CurrentUser() user: JwtPayload) {
    return this.marksService.enterMarks(dto, user.authId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({
    summary: 'Get my own marks (optionally filtered by subject)',
  })
  getMyMarks(
    @CurrentUser() user: JwtPayload,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.marksService.getMyMarks(user.authId, subjectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('report/:studentId/:subjectId')
  @ApiOperation({
    summary:
      'Get final report (theory+practical+internal) for a student+subject',
  })
  getFinalReport(
    @Param('studentId') studentId: string,
    @Param('subjectId') subjectId: string,
  ) {
    return this.marksService.getFinalReport(studentId, subjectId);
  }
}
