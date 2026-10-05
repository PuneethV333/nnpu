import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { RolesGuard } from '@/auth/guard/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import type { JwtPayload } from '@/auth/types/jwt-payload.type';
import { UsersService } from './users.service';
import { TransferStudentDto, UserIdParamDto } from './dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post(':userId/deactivate')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Deactivate a user and revoke their sessions immediately (admins cannot deactivate themselves, nor the last active admin)',
  })
  deactivate(@Param() params: UserIdParamDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.setActive(params.userId, false, user.authId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post(':userId/activate')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Reactivate a previously deactivated user' })
  activate(@Param() params: UserIdParamDto) {
    return this.usersService.setActive(params.userId, true, '');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post(':userId/transfer')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: 'Move a student to another section',
  })
  transfer(@Param() params: UserIdParamDto, @Body() dto: TransferStudentDto) {
    return this.usersService.transferStudent(params.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post(':userId/reset-password')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Generate a temporary password and email it to the user, revoking existing sessions',
  })
  resetPassword(@Param() params: UserIdParamDto) {
    return this.usersService.resetPassword(params.userId);
  }
}
