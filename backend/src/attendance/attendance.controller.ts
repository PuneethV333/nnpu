import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import type { JwtPayload } from '@/auth/types/jwt-payload.type';
import { getMyAttendanceDto } from './dto/get-me.dto';

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
}
