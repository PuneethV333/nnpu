import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { RolesGuard } from '@/auth/guard/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CreateDriveDto } from './dto/create-drive.dto';
import { IdParamDto } from '@/common/dto/id-param.dto';
import { SubmissionStatusQueryDto } from './dto/submission-status-query.dto';
import { ApiOperation } from '@nestjs/swagger';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post('drive')
  @ApiOperation({
    summary: 'Create a new enrollment drive (generates a Google Form)',
  })
  createDrive(@Body() dto: CreateDriveDto) {
    return this.enrollmentService.createDrive(dto);
  }

  @Get('drive')
  listDrives() {
    return this.enrollmentService.listDrives();
  }

  @Get('drive/:id')
  getDrive(@Param() params: IdParamDto) {
    return this.enrollmentService.getDrive(params.id);
  }

  @Get('drive/:id/submissions')
  listSubmissions(
    @Param() params: IdParamDto,
    @Query() query: SubmissionStatusQueryDto,
  ) {
    return this.enrollmentService.listSubmissions(params.id, query.status);
  }

  @Post('submission/:id/promote')
  @ApiOperation({ summary: 'Manually promote/resend one submission' })
  resendOrPromote(@Param() params: IdParamDto) {
    return this.enrollmentService.resendOrPromote(params.id);
  }

  @Post('drive/:id/promote-all')
  @ApiOperation({ summary: 'Manually trigger promotion for an entire drive' })
  triggerPromotion(@Param() params: IdParamDto) {
    return this.enrollmentService.triggerPromotionForDrive(params.id);
  }
}
