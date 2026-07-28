import { SecondLanguage, Stream } from '@/generated/prisma';
import { BadRequestException } from '@nestjs/common';

export const STREAM_CODE: Record<Stream, string> = {
  Science: 'S',
  Commerce: 'C',
};

export const LANG_CODE: Record<SecondLanguage, string> = {
  Kannada: 'K',
  Hindi: 'H',
  Sanskrit: 'S',
};

export const COMBO_CODE: Record<string, string> = {
  PCMB: 'B',
  PCMC: 'C',
  CEBA: 'C',
  SEBA: 'S',
};

// Extracts the PU year digit from Class.name (assumes name contains "1" or "2", e.g. "PU1", "1st PUC")
export function extractPuYear(className: string): string {
  const match = className.match(/[12]/);
  if (!match)
    throw new BadRequestException(
      `Cannot derive PU year from class name "${className}"`,
    );
  return match[0];
}
