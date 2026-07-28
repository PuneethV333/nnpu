import {
  IsDateString,
  IsString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

class SessionEntryDto {
  @IsIn(['Science', 'Commerce'])
  stream!: 'Science' | 'Commerce';

  @IsString()
  name!: string;
}

export class CreateDriveDto {
  @IsString()
  academicYearId!: string;

  @IsDateString()
  closesAt!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SessionEntryDto)
  sessions!: SessionEntryDto[];
}
