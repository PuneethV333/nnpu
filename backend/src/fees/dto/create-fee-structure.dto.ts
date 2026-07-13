import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateFeeStructureDto {
  @ApiProperty()
  @IsString()
  sectionId!: string;

  @ApiProperty()
  @IsString()
  academicYearId!: string;

  @ApiProperty({ example: 5000000, description: 'Amount in paise (₹50,000)' })
  @IsInt()
  @Min(0)
  tuitionFee!: number;

  @ApiProperty({
    example: 200000,
    description: 'Amount in paise',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  examFee?: number;

  @ApiProperty({ example: 0, description: 'Amount in paise', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  transportFee?: number;

  @ApiProperty({ example: 0, description: 'Amount in paise', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  hostelFee?: number;

  @ApiProperty({ example: 0, description: 'Amount in paise', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  otherFee?: number;
}
