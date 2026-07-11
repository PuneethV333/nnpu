import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import type { JwtPayload } from '@/auth/types/jwt-payload.type';
import { getMyAttendanceDto } from './dto/get-me.dto';
import { RolesGuard } from '@/auth/guard/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @UseGuards(JwtAuthGuard)
  @Get('get-me')
  @ApiOperation({
    summary:
      'returns my attendance based on from and to from query {query is required }',
  })
  getMyAttendance(
    @Query() query: getMyAttendanceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendanceService.getMy(user.authId, query.from, query.to);
  }

  @UseGuards(JwtAuthGuard)
  @Get('summary')
  @ApiOperation({
    summary:
      'returns summery of my attendance based on from and to from query {query is required }',
  })
  getMySummary(
    @Query() query: getMyAttendanceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendanceService.mySummary(user.authId, query.from, query.to);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Teacher')
  @Get('roster')
  @ApiOperation({
    summary: 'Get or create attendance roster for a section+date',
  })
  getRoster(
    @Query('sectionId') sectionId: string,
    @Query('date') date: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendanceService.getRoster(sectionId, date, user.authId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Teacher')
  @Post('mark')
  @ApiOperation({ summary: 'Bulk mark/update attendance for a section+date' })
  markAttendance(
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendanceService.markAttendance(dto, user.authId);
  }
}
