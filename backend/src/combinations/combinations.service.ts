import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CombinationArray } from './types/combination.type';

/**
 * The combination (subject-group) catalogue — read-only.
 *
 * The CSV import takes `combination` as a free-text column and the server
 * validates it against the section's stream, which left the single-student form
 * with no way to offer codes that will actually be accepted. This lists them so
 * the picker can be filtered to the chosen section's stream.
 *
 * Deliberately uncached. A cache here could only ever be written by the seed or
 * a migration — neither of which knows about Redis — so a curriculum change
 * would serve the old list for the full TTL. That is the same trap the calendar
 * backfill hit, and the list is four rows.
 */
@Injectable()
export class CombinationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllCombinations(): Promise<CombinationArray> {
    return this.prisma.combination.findMany({
      select: { id: true, stream: true, code: true, idCode: true, name: true },
      orderBy: [{ stream: 'asc' }, { code: 'asc' }],
    });
  }
}
