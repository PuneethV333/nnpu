import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { RolesGuard } from '@/auth/guard/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CalendarService } from './calendar.service';
import { GenerateCalendarDto } from './dto/generate-calendar.dto';
import { OverrideDayDto } from './dto/override-day.dto';

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post('generate')
  @ApiOperation({ summary: 'Generate/update the academic calendar for a year' })
  generateYear(@Body() dto: GenerateCalendarDto) {
    return this.calendarService.generateYear(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get calendar days in a date range' })
  getRange(@Query('from') from: string, @Query('to') to: string) {
    return this.calendarService.getRange(from, to);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post('day/:date/override')
  overrideDay(@Param('date') date: string, @Body() dto: OverrideDayDto) {
    return this.calendarService.overrideDay(date, dto.type, dto.label);
  }
}
