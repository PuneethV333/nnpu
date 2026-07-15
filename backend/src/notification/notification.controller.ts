import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import type { JwtPayload } from '@/auth/types/jwt-payload.type';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('notification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getMine(@CurrentUser() user: JwtPayload) {
    return this.notificationService.getMyNotifications(user.authId);
  }

  @Patch(':id/read')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.notificationService.markAsRead(id, user.authId);
  }

  @Post('register-device')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  registerDevice(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.notificationService.registerDevice(user.authId, dto);
  }
}
