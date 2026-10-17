/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import { MailService } from '@/mail/mail.service';
import * as bcrypt from 'bcrypt';
import { CreateStudentDto } from './dto/create-student.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';

jest.mock('bcrypt');

describe('OnboardingService', () => {
  let service: OnboardingService;
  let prisma: {
    school: { create: jest.Mock };
    personalDetails: { findFirst: jest.Mock };
    subject: { findMany: jest.Mock };
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
    teacherSubject: { createMany: jest.Mock };
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockMail = { send: jest.fn(), sendBulk: jest.fn() };

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
      teacherSubject: { createMany: jest.fn() },
    };

    prisma = {
      school: { create: jest.fn() },
      personalDetails: { findFirst: jest.fn().mockResolvedValue(null) },
      subject: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback) => callback(tx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: LoggerService, useValue: mockLogger },
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mockMail },
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
      stream: 'Science',
      name: 'Test Student',
      schoolId: 'school-1',
    } as CreateStudentDto;

    /**
     * The same UTC-day defect as the admin dashboard: `resolveSection` picked the
     * academic year with `new Date()`. Academic years start on a fixed date, so
     * around local midnight that resolves to the previous calendar day. At 02:00
     * IST on 1 June it selects the year that ended on 31 May, placing new
     * students in the wrong academic year.
     */
    it('selects the academic year by school day, not by UTC day', async () => {
      tx.class.findUnique.mockResolvedValue({ id: 'class-1', name: '1' });

      // 2026-06-01 02:00 IST == 2026-05-31 20:30 UTC, inside the window.
      const clock = new Date('2026-05-31T20:30:00.000Z');
      jest.useFakeTimers().setSystemTime(clock);

      try {
        await service.resolveSection(tx as any, dto).catch(() => undefined);

        expect(tx.academicYear.findFirst).toHaveBeenCalledWith({
          where: {
            startDate: { lte: new Date(Date.UTC(2026, 5, 1)) },
            endDate: { gte: new Date(Date.UTC(2026, 5, 1)) },
          },
        });
      } finally {
        jest.useRealTimers();
      }
    });

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
        session: 'SCI-A',
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

  describe('section session keys', () => {
    it('looks up the section by the stream-disambiguated key', async () => {
      tx.class.findUnique.mockResolvedValue({ id: 'class-1', name: '1' });
      tx.academicYear.findFirst.mockResolvedValue({
        id: 'year-1',
        label: '2025-2026',
        startDate: new Date('2025-06-01'),
      });
      tx.section.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveSection(tx as any, {
          classYear: '1',
          subjectCode: 'PCMB',
          language: 'Kannada',
          session: 'A',
          stream: 'Commerce',
          name: 'Test Student',
          schoolId: 'school-1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      // Enrollment stores "SCI-A"/"COM-A". Looking up the plain label "A" never
      // matched, so a manually created student could not join an
      // enrollment-created section at all.
      // Captured rather than asserted through nested expect.objectContaining,
      // which is typed `any` and trips no-unsafe-assignment.
      const lookup = tx.section.findUnique as unknown as jest.Mock<
        unknown,
        [{ where: { classId_session_academicYearId: { session: string } } }]
      >;
      expect(
        lookup.mock.calls[0][0].where.classId_session_academicYearId.session,
      ).toBe('COM-A');
    });
  });

  describe('createStudent authId integrity', () => {
    it('rejects a subject combination from a different selected stream', async () => {
      jest.spyOn(service, 'resolveSection').mockResolvedValue({
        id: 'section-1',
        academicYear: { startDate: new Date('2026-06-01') },
        session: 'COM-A',
      } as never);
      tx.combination.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ stream: 'Science' });

      await expect(
        service.createStudent({
          classYear: '1',
          subjectCode: 'PCMB',
          language: 'Kannada',
          session: 'A',
          stream: 'Commerce',
          name: 'Test Student',
          schoolId: 'school-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(tx.idSequence.upsert).not.toHaveBeenCalled();
      expect(tx.user.create).not.toHaveBeenCalled();
      expect(tx.auth.create).not.toHaveBeenCalled();
    });

    it('never interpolates "undefined" for an unmapped combination', async () => {
      jest.spyOn(service, 'resolveSection').mockResolvedValue({
        id: 'section-1',
        academicYear: { startDate: new Date('2026-06-01') },
        session: 'SCI-A',
      } as never);
      tx.combination.findFirst.mockResolvedValue({
        id: 'combo-x',
        idCode: 'PCEB', // absent from COMBO_CODE
        stream: 'Science',
      });

      // `COMBO_CODE` is Record<string, string>, so TS cannot prove the lookup is
      // total. Without the guard the authId became nnpu1Sundefined26KA001 and
      // every unmapped combination shared one id-sequence bucket.
      await expect(
        service.createStudent({
          classYear: '1',
          subjectCode: 'PCEB',
          language: 'Kannada',
          session: 'A',
          stream: 'Science',
          name: 'Test Student',
          schoolId: 'school-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(tx.auth.create).not.toHaveBeenCalled();
    });

    it('puts the plain session label in the authId, not the stored key', async () => {
      jest.spyOn(service, 'resolveSection').mockResolvedValue({
        id: 'section-1',
        academicYear: { startDate: new Date('2026-06-01') },
        // Stored key. Enrollment passes the display name for exactly this reason.
        session: 'SCI-A',
      } as never);
      tx.combination.findFirst.mockResolvedValue({
        id: 'combo-1',
        idCode: 'PCMB',
        stream: 'Science',
      });
      tx.idSequence.upsert.mockResolvedValue({ lastValue: 1 });
      tx.user.create.mockResolvedValue({ id: 'user-1' });
      tx.auth.create.mockResolvedValue({});

      await service.createStudent({
        classYear: '1',
        subjectCode: 'PCMB',
        language: 'Kannada',
        session: 'A',
        stream: 'Science',
        name: 'Test Student',
        schoolId: 'school-1',
      });

      const authMock = tx.auth.create as unknown as jest.Mock<
        unknown,
        [{ data: { authId: string } }]
      >;
      const authArg = authMock.mock.calls[0][0];
      // nnpu + 1 + S + B + 26 + K + A + 001 — and exactly that length, since the
      // segment is derived through authIdSessionSegment rather than by trusting
      // Section.session.
      expect(authArg.data.authId).toBe('nnpu1SB26KA001');
      expect(authArg.data.authId).not.toContain('SCI');
      expect(authArg.data.authId).not.toContain('undefined');
      expect(authArg.data.authId).toMatch(
        /^nnpu[12][SBC][BCS][0-9]{2}[KHS][A-Z][0-9]{3}$/,
      );
    });
  });

  describe('createStudent', () => {
    const dto = {
      classYear: '1',
      subjectCode: 'PCMB',
      language: 'Kannada',
      session: 'A',
      stream: 'Science',
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
      session: 'SCI-A',
    };

    beforeEach(() => {
      jest
        .spyOn(service, 'resolveSection')
        .mockResolvedValue(mockSection as any);

      tx.combination.findFirst.mockResolvedValue({
        id: 'combo-1',
        idCode: 'PCMB',
        stream: 'Science',
      });
    });

    it('generates the correct authId and creates User/Auth/PersonalDetails', async () => {
      tx.idSequence.upsert.mockResolvedValue({
        id: 'nnpu-1-S-B-25-K-A',
        lastValue: 1,
      });
      tx.user.create.mockResolvedValue({ id: 'user-1' });
      tx.auth.create.mockResolvedValue({});
      tx.personalDetails.create.mockResolvedValue({});

      const result = await service.createStudent(dto);

      expect(tx.idSequence.upsert).toHaveBeenCalledWith({
        where: { id: 'nnpu-1-S-B-25-K-A' },
        create: { id: 'nnpu-1-S-B-25-K-A', lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('nnpu123', 10);

      expect(tx.user.create).toHaveBeenCalledWith({
        data: {
          role: 'Student',
          schoolId: dto.schoolId,
          sectionId: mockSection.id,
          combinationId: 'combo-1',
          language: 'Kannada',
        },
      });

      expect(tx.auth.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          authId: 'nnpu1SB25KA001',
          password: 'hashed_nnpu123',
        },
      });

      expect(tx.personalDetails.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: dto.name,
          profilePic: '',
          // Must be null, not ''. The column is @unique and an empty string is
          // a value, so the second manually-created account collided with the
          // first (P2002 -> 500). Postgres excludes NULLs from unique indexes.
          email: null,
        },
      });

      expect(result).toEqual({
        userId: 'user-1',
        authId: 'nnpu1SB25KA001',
      });
    });

    it('pads serial correctly for higher sequence values', async () => {
      tx.idSequence.upsert.mockResolvedValue({
        id: 'nnpu-1-S-B-25-K-A',
        lastValue: 47,
      });
      tx.user.create.mockResolvedValue({ id: 'user-2' });

      const result = await service.createStudent(dto);

      expect(result.authId).toBe('nnpu1SB25KA047');
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

  describe('createTeacher', () => {
    const dto: CreateTeacherDto = {
      name: 'Ravi Kumar',
      email: 'ravi@school.test',
      subjectIds: ['sub-1', 'sub-2'],
      schoolId: 'school-1',
    };

    beforeEach(() => {
      tx.idSequence.upsert.mockResolvedValue({ lastValue: 7 });
      tx.user.create.mockResolvedValue({ id: 'user-1' });
      tx.auth.create.mockResolvedValue({});
      tx.personalDetails.create.mockResolvedValue({});
      tx.teacherSubject.createMany.mockResolvedValue({ count: 2 });
      prisma.subject.findMany.mockResolvedValue([
        { id: 'sub-1' },
        { id: 'sub-2' },
      ]);
      mockMail.send.mockResolvedValue(undefined);
    });

    it('writes the subjects and the email with the account, then mails the login id', async () => {
      const result = await service.createTeacher(dto);

      // The subject rows are inside the account's transaction, so a teacher can
      // never exist with half a subject list.
      expect(tx.teacherSubject.createMany).toHaveBeenCalledWith({
        data: [
          { teacherId: 'user-1', subjectId: 'sub-1' },
          { teacherId: 'user-1', subjectId: 'sub-2' },
        ],
      });
      expect(tx.personalDetails.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Ravi Kumar',
          profilePic: '',
          email: 'ravi@school.test',
        },
      });

      expect(result).toEqual({
        userId: 'user-1',
        authId: 'nnpuT26007',
        emailedTo: 'ravi@school.test',
        emailSent: true,
      });
      expect(mockMail.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'ravi@school.test' }),
      );
      expect(mockMail.send.mock.calls[0][0].body).toContain('nnpuT26007');
    });

    it('rejects an email that is already in use before writing anything', async () => {
      prisma.personalDetails.findFirst.mockResolvedValue({ userId: 'other' });

      await expect(service.createTeacher(dto)).rejects.toThrow(
        ConflictException,
      );

      // Nothing must be written: the sequence bump is what keeps authIds unique.
      expect(tx.idSequence.upsert).not.toHaveBeenCalled();
      expect(mockMail.send).not.toHaveBeenCalled();
    });

    it('rejects a subject id that does not exist', async () => {
      prisma.subject.findMany.mockResolvedValue([{ id: 'sub-1' }]);

      await expect(service.createTeacher(dto)).rejects.toThrow(
        BadRequestException,
      );

      expect(tx.user.create).not.toHaveBeenCalled();
    });

    it('keeps the account and reports it when the credential mail fails', async () => {
      mockMail.send.mockRejectedValue(new Error('smtp down'));

      // A bounced email is a delivery problem, not a reason to discard the
      // account or burn the id it was given.
      await expect(service.createTeacher(dto)).resolves.toEqual({
        userId: 'user-1',
        authId: 'nnpuT26007',
        emailedTo: 'ravi@school.test',
        emailSent: false,
      });
      expect(tx.user.create).toHaveBeenCalled();
    });

    it('dedupes a subject listed twice', async () => {
      prisma.subject.findMany.mockResolvedValue([{ id: 'sub-1' }]);

      await service.createTeacher({ ...dto, subjectIds: ['sub-1', 'sub-1'] });

      // [teacherId, subjectId] is unique, so a repeated id would abort the
      // transaction on P2002.
      expect(tx.teacherSubject.createMany).toHaveBeenCalledWith({
        data: [{ teacherId: 'user-1', subjectId: 'sub-1' }],
      });
    });

    it('creates no subject rows and sends no mail when there are no subjects', async () => {
      await expect(
        service.createTeacher({ ...dto, email: '', subjectIds: [] }),
      ).resolves.toEqual({
        userId: 'user-1',
        authId: 'nnpuT26007',
        emailedTo: null,
        emailSent: false,
      });

      expect(tx.teacherSubject.createMany).not.toHaveBeenCalled();
      expect(mockMail.send).not.toHaveBeenCalled();
      // Not `''`: an empty string is a real value and would collide on the
      // unique index with the next account created the same way.
      expect(tx.personalDetails.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: null }),
        }),
      );
    });
  });
});
