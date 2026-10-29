import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { RolesGuard } from '@/auth/guard/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import type { JwtPayload } from '@/auth/types/jwt-payload.type';
import { UsersService } from './users.service';
import {
  PassOutStudentsDto,
  TransferStudentDto,
  UpdateProfilePicDto,
  UserIdParamDto,
} from './dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * The staffing pickers' list of teachers. Declared above the `:userId/*`
   * routes for the same reason as `pass-out`: the literal path reads first,
   * though there is no collision — the others all have a second segment.
   *
   * Admin-only, matching the staffing screens that consume it. It is not a
   * directory: an id, a display name and the subject ids recorded against the
   * teacher, and nothing else.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Get('teachers')
  @ApiOperation({
    summary:
      'Active teachers (id + name) for the staffing pickers (admin only)',
  })
  getTeachers() {
    return this.usersService.getTeachers();
  }

  /**
   * The caller's own profile picture.
   *
   * The only route in this controller that is not admin-only — every role
   * changes their own avatar, and nobody changes anyone else's, so there is no
   * `:userId` to guard. `JwtAuthGuard` alone, deliberately no `RolesGuard`.
   *
   * Takes a URL, not a file. The app uploads the image to Cloudinary and sends
   * the delivery URL back; the DTO pins the host so this column cannot be
   * pointed at an arbitrary server (see `UpdateProfilePicDto`).
   *
   * 10/min: a user picking a new photo does it once, and each call clears the
   * attendance roster cache for students.
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me/profile-pic')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Set the caller's own profile picture URL" })
  updateMyProfilePic(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfilePicDto,
  ) {
    return this.usersService.updateMyProfilePic(user.authId, dto.url);
  }

  /**
   * Declared before the `:userId/*` routes, though it would not collide with
   * them: those all have a second path segment (`/users/:userId/deactivate`),
   * so `/users/pass-out` cannot match one. Declared first so the literal path
   * reads before the parameterised ones.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post('pass-out')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Deactivate every active student in the given sections and revoke their sessions (admin only). Scoped to students, so a class teacher in a passing-out cohort is reported and left alone.',
  })
  passOutStudents(@Body() dto: PassOutStudentsDto) {
    return this.usersService.passOutStudents(dto);
  }

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post(':userId/send-credentials')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Email the user their auth ID and default password, leaving the password unchanged',
  })
  sendCredentials(@Param() params: UserIdParamDto) {
    return this.usersService.sendCredentials(params.userId);
  }
}
