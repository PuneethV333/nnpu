import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RolesGuard } from '@/auth/guard/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { AnnouncementService } from './announcement.service';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { AnnouncementDto } from './dto/announcement-Query.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import type { JwtPayload } from '@/auth/types/jwt-payload.type';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementIdParamDto } from './dto/announcement-id-param.dto';

@Controller('announcement')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get('latest')
  @UseGuards(JwtAuthGuard)
  findLatest(@CurrentUser() user: JwtPayload) {
    return this.announcementService.findLatest(user.authId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Create an announcement (Global / School / Section audience)',
  })
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: JwtPayload) {
    return this.announcementService.create(user.authId, dto);
  }

  // NOTE: `all` MUST stay declared above `:id`. Nest matches routes in
  // declaration order, so a literal `@Get(':id')` first would swallow
  // `/announcement/all` with id="all" and 404/throw instead of listing.
  @Get('all')
  @UseGuards(JwtAuthGuard)
  findAll(@Query() query: AnnouncementDto, @CurrentUser() user: JwtPayload) {
    return this.announcementService.findAll(query, user.authId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param() params: AnnouncementIdParamDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.announcementService.details(params.id, user.authId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Update an announcement (author, or an admin in the same school)',
  })
  update(
    @Param() params: AnnouncementIdParamDto,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.announcementService.update(user.authId, params.id, dto);
  }

  // Default 200 rather than 204: the service returns a confirmation payload,
  // which 204 would silently discard.
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiOperation({ summary: 'Delete an announcement' })
  remove(
    @Param() params: AnnouncementIdParamDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.announcementService.remove(user.authId, params.id);
  }
}
