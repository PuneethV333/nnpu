import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AnnouncementTypes } from '@/generated/prisma';
import { IsBoundedId } from '@/common/decorators/is-bounded-id.decorator';

/**
 * Who an announcement is addressed to.
 *
 * `Global`  -> schoolId=null, sectionId=null, visible to every authenticated user.
 * `School`  -> the author's own school, all sections.
 * `Section` -> one section; `sectionId` is then required.
 *
 * Mirrors the read-side audience filter (`audienceWhere`), which treats
 * `schoolId: null` as a genuinely global post.
 */
export enum AnnouncementAudience {
  Global = 'Global',
  School = 'School',
  Section = 'Section',
}

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Holiday notice' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'School will be closed on 15th October.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @ApiProperty({ enum: AnnouncementTypes, example: AnnouncementTypes.Holiday })
  @IsEnum(AnnouncementTypes)
  type!: AnnouncementTypes;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiProperty({
    enum: AnnouncementAudience,
    example: AnnouncementAudience.School,
    default: AnnouncementAudience.School,
  })
  @IsEnum(AnnouncementAudience)
  audience!: AnnouncementAudience;

  @ApiProperty({
    example: 'clx1234567890abcdefghijk',
    description: 'Required when audience is Section.',
    required: false,
  })
  @IsOptional()
  @IsBoundedId()
  sectionId?: string;
}
