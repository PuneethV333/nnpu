import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SubjectArray } from './types/subject.type';

/**
 * The subject catalogue — read-only.
 *
 * Subjects only ever reached the client as a side effect of a section's
 * assignments, so a screen that needed to name a subject outside a section (the
 * create-teacher form, which records what a teacher teaches with no session
 * involved) had nothing to offer. This is that list.
 *
 * Alphabetical, and deliberately uncached: nothing but a seed or a migration
 * writes `Subject`, neither of which can invalidate Redis, so a cached list
 * would keep serving a retired subject for the whole TTL.
 */
@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllSubjects(): Promise<SubjectArray> {
    return this.prisma.subject.findMany({
      select: { id: true, name: true, hasPractical: true },
      orderBy: { name: 'asc' },
    });
  }
}
