import { Controller, Get, UseGuards } from '@nestjs/common';
import { TimetableService } from './time-table.service';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { ApiProperty } from '@nestjs/swagger';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import type { JwtPayload } from '@/auth/types/jwt-payload.type';

@Controller('time-table')
export class TimeTableController {
  constructor(private readonly timeTableService: TimetableService) {}
  @Get('')
  @UseGuards(JwtAuthGuard)
  @ApiProperty()
  get(@CurrentUser() user: JwtPayload) {
    return this.timeTableService.getTimetable(user.authId);
  }
}
