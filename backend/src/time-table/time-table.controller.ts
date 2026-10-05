import { Controller, Get, UseGuards } from '@nestjs/common';
import { TimetableService } from './time-table.service';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import type { JwtPayload } from '@/auth/types/jwt-payload.type';

@Controller('time-table')
export class TimeTableController {
  constructor(private readonly timeTableService: TimetableService) {}
  @Get('')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Full weekly timetable for the signed-in user' })
  get(@CurrentUser() user: JwtPayload) {
    return this.timeTableService.getTimetable(user.authId);
  }

  @Get('todays')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Today's periods for the signed-in user" })
  getTodays(@CurrentUser() user: JwtPayload) {
    return this.timeTableService.getTimetableToday(user.authId);
  }
}
