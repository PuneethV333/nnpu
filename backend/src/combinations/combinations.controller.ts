import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { RolesGuard } from '@/auth/guard/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CombinationsService } from './combinations.service';

@ApiTags('combinations')
@ApiBearerAuth()
@Controller('combinations')
export class CombinationsController {
  constructor(private readonly combinationsService: CombinationsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Teacher', 'Admin')
  @Get()
  @ApiOperation({ summary: 'All subject combinations (Teacher or Admin)' })
  getAllCombinations() {
    return this.combinationsService.getAllCombinations();
  }
}
