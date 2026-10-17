import { Test, TestingModule } from '@nestjs/testing';
import { CombinationsService } from './combinations.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('CombinationsService', () => {
  let service: CombinationsService;
  let prisma: { combination: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { combination: { findMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CombinationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CombinationsService);
  });

  it('returns every combination with the idCode the create path needs', async () => {
    const rows = [
      {
        id: 'c1',
        stream: 'Science',
        code: 'PCMB',
        idCode: 'PCMB',
        name: 'PCB',
      },
    ];
    prisma.combination.findMany.mockResolvedValue(rows);

    await expect(service.getAllCombinations()).resolves.toEqual(rows);

    // `idCode` must be in the select: it is what `CreateStudentDto.subjectCode`
    // is matched against, and the picker cannot send what it never received.
    expect(prisma.combination.findMany).toHaveBeenCalledWith({
      select: { id: true, stream: true, code: true, idCode: true, name: true },
      orderBy: [{ stream: 'asc' }, { code: 'asc' }],
    });
  });
});
