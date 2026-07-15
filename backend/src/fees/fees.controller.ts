import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';

import { FeesService } from './fees.service';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { RolesGuard } from '@/auth/guard/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { ApiOperation } from '@nestjs/swagger';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { UpdateFeeStructureDto } from './dto/update-fee-structure.dto';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { HandleRazorpayWebhookDto } from './dto/handle-razorpay-webhook.dto';
import type { JwtPayload } from '@/auth/types/jwt-payload.type';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Request } from 'express';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

@Controller('fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post('structure')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Create a fee structure for a section+academic year',
  })
  createFeeStructure(@Body() dto: CreateFeeStructureDto) {
    return this.feesService.createFeeStructure(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Teacher')
  @Get('structure')
  @ApiOperation({
    summary: 'Get the fee structure for a section+academic year',
  })
  getFeeStructure(
    @Query('sectionId') sectionId: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.feesService.getFeeStructure(sectionId, academicYearId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Patch('structure/:id')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Update a fee structure (only before any invoices exist)',
  })
  updateFeeStructure(
    @Param('id') id: string,
    @Body() dto: UpdateFeeStructureDto,
  ) {
    return this.feesService.updateFeeStructure(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post('invoices/generate')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary:
      "Generate invoices for every active student in a fee structure's section",
  })
  generateInvoices(@Body() dto: GenerateInvoicesDto) {
    return this.feesService.generateInvoices(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invoices/me')
  @ApiOperation({ summary: 'Get my own invoices' })
  getMyInvoices(@CurrentUser() user: JwtPayload) {
    return this.feesService.getInvoicesForStudentByAuth(user.authId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Get('invoices/student/:studentId')
  @ApiOperation({ summary: 'Get invoices for a specific student (Admin only)' })
  getStudentInvoices(@Param('studentId') studentId: string) {
    return this.feesService.getInvoicesForStudent(studentId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get a single invoice by id (owner or Admin only)' })
  getInvoice(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.feesService.getInvoice(id, user.authId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invoices/:id/payment-order')
  @ApiOperation({
    summary: 'Create a Razorpay order for the pending amount on an invoice',
  })
  createPaymentOrder(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.feesService.createPaymentOrder(id, user.authId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('payments/verify')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Verify a Razorpay payment after checkout completes client-side',
  })
  verifyPayment(@Body() dto: HandleRazorpayWebhookDto) {
    return this.feesService.verifyPayment(dto);
  }

  @Post('webhook/razorpay')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Razorpay server-to-server webhook (public, signature-verified)',
  })
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body');
    }
    return this.feesService.handleWebhookEvent(req.rawBody, signature);
  }
}
