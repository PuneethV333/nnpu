/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateStudentDto } from './dto/create-student.dto';

jest.mock('bcrypt');

describe('OnboardingService', () => {
  let service: OnboardingService;
  let prisma: {
    school: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  let tx: {
    class: { findUnique: jest.Mock };
    combination: { findFirst: jest.Mock };
    academicYear: { findFirst: jest.Mock };
    section: { findUnique: jest.Mock };
    idSequence: { upsert: jest.Mock };
    user: { create: jest.Mock };
    auth: { create: jest.Mock };
    personalDetails: { create: jest.Mock };
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    tx = {
      class: { findUnique: jest.fn() },
      combination: { findFirst: jest.fn() },
      academicYear: { findFirst: jest.fn() },
      section: { findUnique: jest.fn() },
      idSequence: { upsert: jest.fn() },
      user: { create: jest.fn() },
      auth: { create: jest.fn() },
      personalDetails: { create: jest.fn() },
    };

    prisma = {
      school: { create: jest.fn() },
      $transaction: jest.fn((callback) => callback(tx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: LoggerService, useValue: mockLogger },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);

    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_nnpu123');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSchool', () => {
    it('creates a school with the given name', async () => {
      const created = { id: 'school-1', name: 'NNPU' };
      prisma.school.create.mockResolvedValue(created);

      const result = await service.createSchool('NNPU');

      expect(prisma.school.create).toHaveBeenCalledWith({
        data: { name: 'NNPU' },
      });
      expect(result).toEqual(created);
    });
  });

  describe('resolveSection', () => {
    const dto = {
      classYear: '1',
      subjectCode: 'PCMB',
      language: 'Kannada',
      session: 'A',
      name: 'Test Student',
      schoolId: 'school-1',
    } as CreateStudentDto;

    it('throws NotFoundException if class does not exist', async () => {
      tx.class.findUnique.mockResolvedValue(null);

      await expect(service.resolveSection(tx as any, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(tx.class.findUnique).toHaveBeenCalledWith({
        where: { name: dto.classYear },
      });
    });

    it('throws NotFoundException if combination does not exist', async () => {
      tx.class.findUnique.mockResolvedValue({ id: 'class-1', name: '1' });
      tx.combination.findFirst.mockResolvedValue(null);

      await expect(service.resolveSection(tx as any, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException if no active academic year found', async () => {
      tx.class.findUnique.mockResolvedValue({ id: 'class-1', name: '1' });
      tx.combination.findFirst.mockResolvedValue({
        id: 'combo-1',
        idCode: 'PCMB',
        stream: 'Science',
      });
      tx.academicYear.findFirst.mockResolvedValue(null);

      await expect(service.resolveSection(tx as any, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException if no matching section found', async () => {
      tx.class.findUnique.mockResolvedValue({ id: 'class-1', name: '1' });
      tx.combination.findFirst.mockResolvedValue({
        id: 'combo-1',
        idCode: 'PCMB',
        stream: 'Science',
      });
      tx.academicYear.findFirst.mockResolvedValue({
        id: 'year-1',
        label: '2025-2026',
        startDate: new Date('2025-06-01'),
      });
      tx.section.findUnique.mockResolvedValue(null);

      await expect(service.resolveSection(tx as any, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the resolved section on success', async () => {
      const mockSection = {
        id: 'section-1',
        class: { id: 'class-1', name: '1' },
        combination: { id: 'combo-1', idCode: 'PCMB', stream: 'Science' },
        academicYear: {
          id: 'year-1',
          label: '2025-2026',
          startDate: new Date('2025-06-01'),
        },
        language: 'Kannada',
        session: 'A',
      };

      tx.class.findUnique.mockResolvedValue({ id: 'class-1', name: '1' });
      tx.combination.findFirst.mockResolvedValue({
        id: 'combo-1',
        idCode: 'PCMB',
        stream: 'Science',
      });
      tx.academicYear.findFirst.mockResolvedValue({
        id: 'year-1',
        label: '2025-2026',
        startDate: new Date('2025-06-01'),
      });
      tx.section.findUnique.mockResolvedValue(mockSection);

      const result = await service.resolveSection(tx as any, dto);

      expect(result).toEqual(mockSection);
    });
  });

  describe('createStudent', () => {
    const dto = {
      classYear: '1',
      subjectCode: 'PCMB',
      language: 'Kannada',
      session: 'A',
      name: 'Test Student',
      profilePic: '',
      schoolId: 'school-1',
    } as CreateStudentDto;

    const mockSection = {
      id: 'section-1',
      class: { id: 'class-1', name: '1' },
      combination: { id: 'combo-1', idCode: 'PCMB', stream: 'Science' },
      academicYear: {
        id: 'year-1',
        label: '2025-2026',
        startDate: new Date('2025-06-01'),
      },
      language: 'Kannada',
      session: 'A',
    };

    beforeEach(() => {
      // stub resolveSection so createStudent tests don't re-test its internals
      jest
        .spyOn(service, 'resolveSection')
        .mockResolvedValue(mockSection as any);
    });

    it('generates the correct authId and creates User/Auth/PersonalDetails', async () => {
      tx.idSequence.upsert.mockResolvedValue({
        id: 'nnpu-1-SCI-PCMB-25-KN-A',
        lastValue: 1,
      });
      tx.user.create.mockResolvedValue({ id: 'user-1' });
      tx.auth.create.mockResolvedValue({});
      tx.personalDetails.create.mockResolvedValue({});

      const result = await service.createStudent(dto);

      expect(tx.idSequence.upsert).toHaveBeenCalledWith({
        where: { id: 'nnpu-1-SCI-PCMB-25-KN-A' },
        create: { id: 'nnpu-1-SCI-PCMB-25-KN-A', lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('nnpu123', 10);

      expect(tx.user.create).toHaveBeenCalledWith({
        data: {
          role: 'Student',
          schoolId: dto.schoolId,
          sectionId: mockSection.id,
        },
      });

      expect(tx.auth.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          authId: 'nnpu1SCIPCMB25KNA001',
          password: 'hashed_nnpu123',
        },
      });

      expect(tx.personalDetails.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: dto.name,
          profilePic: '',
        },
      });

      expect(result).toEqual({
        userId: 'user-1',
        authId: 'nnpu1SCIPCMB25KNA001',
      });
    });

    it('pads serial correctly for higher sequence values', async () => {
      tx.idSequence.upsert.mockResolvedValue({
        id: 'nnpu-1-SCI-PCMB-25-KN-A',
        lastValue: 47,
      });
      tx.user.create.mockResolvedValue({ id: 'user-2' });

      const result = await service.createStudent(dto);

      expect(result.authId).toBe('nnpu1SCIPCMB25KNA047');
    });

    it('propagates NotFoundException from resolveSection without creating anything', async () => {
      jest
        .spyOn(service, 'resolveSection')
        .mockRejectedValue(new NotFoundException('Section not found'));

      await expect(service.createStudent(dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(tx.user.create).not.toHaveBeenCalled();
      expect(tx.idSequence.upsert).not.toHaveBeenCalled();
    });
  });
});
