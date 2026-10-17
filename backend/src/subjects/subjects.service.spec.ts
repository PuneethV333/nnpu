import { Test, TestingModule } from '@nestjs/testing';
import { SubjectsService } from './subjects.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('SubjectsService', () => {
  let service: SubjectsService;
  let prisma: { subject: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { subject: { findMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SubjectsService);
  });

  it('lists every subject alphabetically with its practical flag', async () => {
    const rows = [
      { id: 's1', name: 'Chemistry', hasPractical: true },
      { id: 's2', name: 'English', hasPractical: false },
    ];
    prisma.subject.findMany.mockResolvedValue(rows);

    await expect(service.getAllSubjects()).resolves.toEqual(rows);

    expect(prisma.subject.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true, hasPractical: true },
      orderBy: { name: 'asc' },
    });
  });
});
