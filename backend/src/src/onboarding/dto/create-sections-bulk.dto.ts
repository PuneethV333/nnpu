import {
  IsIn,
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

export class CreateSectionsBulkDto {
  @IsIn(['1', '2'])
  classYear!: string;

  @IsString()
  @IsNotEmpty()
  academicYearId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  sessions!: string[];
}
