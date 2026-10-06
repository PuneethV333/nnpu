import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { RolesGuard } from '@/auth/guard/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { EnrollmentService } from './enrollment.service';
import { PromotionService } from './promotion.service';
import { ImportStudentsDto } from './dto/import-students.dto';
import { PromoteTo2ndPucDto } from './dto/promote-to-2nd-puc.dto';
import { BadRequestException } from '@nestjs/common';

/** Refuses oversized uploads before the body is buffered into memory. */
const MAX_CSV_BYTES = 1024 * 1024;

@ApiTags('enrollment')
@Controller('enrollment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
export class EnrollmentController {
  constructor(
    private readonly enrollmentService: EnrollmentService,
    private readonly promotionService: PromotionService,
  ) {}

  @Post('students/import')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_CSV_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Import a CSV roster into one session (admin only). Creates a portal account per row and emails the login ID.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'sectionId', 'year'],
      properties: {
        file: { type: 'string', format: 'binary' },
        sectionId: { type: 'string', example: 'clx1234567890abcdefghijk' },
        year: { type: 'integer', example: 2026 },
      },
    },
  })
  // Tight because one call can create an entire cohort of accounts. Sized for
  // a handful of bulk uploads in a session, not a per-file loop.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async importStudents(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: ImportStudentsDto,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No CSV file was uploaded (field name: file)',
      );
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('The uploaded CSV file is empty');
    }

    return this.enrollmentService.importStudentsFromCsv(
      dto,
      file.buffer.toString('utf8'),
    );
  }

  @Post('promote-2nd-puc')
  @ApiOperation({
    summary:
      'Move every active student in the given 1st-PUC sections into the matching 2nd-PUC section of the next academic year (admin only).',
  })
  // Tighter than the CSV import: this rewrites section membership for a whole
  // cohort in one call and creates the destination sections.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  promoteTo2ndPuc(@Body() dto: PromoteTo2ndPucDto) {
    return this.promotionService.promoteTo2ndPuc(dto);
  }
}
