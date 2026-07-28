import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class GenerateInvoicesDto {
  @ApiProperty()
  @IsString()
  feeStructureId!: string;

  @ApiProperty({ example: '2026-08-15' })
  @IsDateString()
  dueDate!: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;
}
