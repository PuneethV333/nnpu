import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload } from './types/jwt-payload.type';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { changePasswordDto } from './dto/change-password.dto';
import { Throttle } from '@nestjs/throttler';
import { refreshDto } from './dto/refresh.dto';
import { RolesGuard } from './guard/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { StudentsDetailsQueryDto } from './dto/students-details-query.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  // IP-keyed, so it is only a coarse cap against spraying many auth ids from one
  // host. It used to be 5/minute, which is fine per user but not for a school
  // sharing one NAT/ISP address — the whole campus locked each other out at
  // 8:30am. Per-auth-id lockout (which is what actually stops brute force) lives
  // in AuthService.login().
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with school/auth ID and password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  refresh(@Body() dto: refreshDto) {
    return this.authService.refresh(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current logged-in user profile' })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.authId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Logout and invalidate current user' })
  logout(@CurrentUser() user: JwtPayload & { exp: number }) {
    return this.authService.logOut(user.authId, user.jti, user.exp);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'change password {requires current password}' })
  changePassWord(
    @CurrentUser() user: JwtPayload,
    @Body() dto: changePasswordDto,
  ) {
    return this.authService.changePassword(user.authId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Teacher')
  @Get('students-details')
  @ApiOperation({
    summary: 'Get students details based on sectionId',
  })
  getAllStudents(
    @Query() query: StudentsDetailsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.authService.getAllStudents(query.sectionId, user.authId);
  }
}
