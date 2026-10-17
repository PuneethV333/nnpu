import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { RolesGuard } from '@/auth/guard/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { SubjectsService } from './subjects.service';

@ApiTags('subjects')
@ApiBearerAuth()
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  // Read-only reference data that both staff roles legitimately need; there is
  // no per-school scoping to enforce here yet.
  @Roles('Teacher', 'Admin')
  @Get()
  @ApiOperation({ summary: 'All subjects (Teacher or Admin)' })
  getAllSubjects() {
    return this.subjectsService.getAllSubjects();
  }
}
