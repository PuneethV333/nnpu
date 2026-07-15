import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { RolesGuard } from '@/auth/guard/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { ReportCardService } from './report-card.service';

@ApiTags('report-card')
@ApiBearerAuth()
@Controller('report-card')
export class ReportCardController {
  constructor(private readonly reportCardService: ReportCardService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Teacher')
  @Post(':studentId/:academicYearId/generate')
  requestGeneration(
    @Param('studentId') studentId: string,
    @Param('academicYearId') academicYearId: string,
  ) {
    return this.reportCardService.requestReportCard(studentId, academicYearId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':studentId/:academicYearId/status')
  getStatus(
    @Param('studentId') studentId: string,
    @Param('academicYearId') academicYearId: string,
  ) {
    return this.reportCardService.getStatus(studentId, academicYearId);
  }
}
