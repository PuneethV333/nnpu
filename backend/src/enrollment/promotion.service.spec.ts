import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import type { PromoteTo2ndPucDto } from './dto/promote-to-2nd-puc.dto';

const SCI_A = 'section-sci-a';
const COM_B = 'section-com-b';

const AY_26 = {
  id: 'ay-26',
  label: '2026-27',
  startDate: new Date('2026-06-01'),
  endDate: new Date('2027-03-31'),
};

const section = (
  id: string,
  name: string,
  session: string,
  className = '1',
) => ({
  id,
  name,
  session,
  classId: `class-${className}`,
  academicYearId: AY_26.id,
  class: { id: `class-${className}`, name: className },
  academicYear: AY_26,
});

const dto = (
  sectionIds: string[],
  extra: Partial<PromoteTo2ndPucDto> = {},
): PromoteTo2ndPucDto => ({
  sections: sectionIds.map((sectionId) => ({ sectionId })),
  ...extra,
});

describe('PromotionService.promoteTo2ndPuc', () => {
  let prisma: {
    class: { findUnique: jest.Mock };
    section: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
    academicYear: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    user: { findMany: jest.Mock; updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: {
    section: { findUnique: jest.Mock; create: jest.Mock };
    user: { updateMany: jest.Mock };
  };
  let updateMany: jest.Mock;
  let sectionCreate: jest.Mock;
  let service: PromotionService;
  let logger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    updateMany = jest.fn().mockResolvedValue({ count: 2 });
    sectionCreate = jest
      .fn()
      .mockImplementation(({ data }: { data: { session: string } }) =>
        Promise.resolve({
          id: `new-${data.session}`,
          name: `2-${data.session}`,
        }),
      );

    tx = {
      section: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: sectionCreate,
      },
      user: { updateMany },
    };

    prisma = {
      class: {
        findUnique: jest.fn().mockResolvedValue({ id: 'class-2', name: '2' }),
      },
      section: {
        findMany: jest
          .fn()
          .mockResolvedValue([section(SCI_A, '1-SCI-A', 'SCI-A')]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: sectionCreate,
      },
      academicYear: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'ay-27',
          label: '2027-28',
          startDate: new Date('2027-06-01'),
          endDate: new Date('2028-03-31'),
        }),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'u1',
            sectionId: SCI_A,
            isActive: true,
            details: { name: 'Ananya' },
          },
          {
            id: 'u2',
            sectionId: SCI_A,
            isActive: true,
            details: { name: 'Rahul' },
          },
        ]),
        updateMany,
      },
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
    };

    logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    service = new PromotionService(prisma as never, logger as never);
  });

  it('moves students into the same session key in class 2', async () => {
    const result = await service.promoteTo2ndPuc(dto([SCI_A]));

    expect(result.moved).toBe(2);
    expect(result.sections).toEqual([
      {
        sourceSectionId: SCI_A,
        sourceName: '1-SCI-A',
        targetSectionId: 'new-SCI-A',
        targetName: '2-SCI-A',
        targetCreated: true,
        studentsToMove: 2,
        skipped: [],
      },
    ]);
  });

  it('reuses an existing target section instead of creating a duplicate', async () => {
    tx.section.findUnique.mockResolvedValue({ id: 'existing-2-sci-a' });

    const result = await service.promoteTo2ndPuc(dto([SCI_A]));

    expect(sectionCreate).not.toHaveBeenCalled();
    expect(result.sections[0].targetSectionId).toBe('existing-2-sci-a');
    expect(result.sections[0].targetCreated).toBe(false);
  });

  it('derives the next academic year from the source year own dates', async () => {
    await service.promoteTo2ndPuc(dto([SCI_A]));

    // June–March + 1 year, not a hardcoded calendar. A school running
    // April–March keeps its own span.
    expect(prisma.academicYear.create).toHaveBeenCalledWith({
      data: {
        label: '2027-28',
        startDate: new Date('2027-06-01'),
        endDate: new Date('2028-03-31'),
      },
    });
  });

  it('reuses an existing next year instead of creating a duplicate', async () => {
    prisma.academicYear.findFirst.mockResolvedValue({
      id: 'ay-27-existing',
      label: '2027-28',
      startDate: new Date('2027-06-01'),
      endDate: new Date('2028-03-31'),
    });

    const result = await service.promoteTo2ndPuc(dto([SCI_A]));

    expect(prisma.academicYear.create).not.toHaveBeenCalled();
    expect(result.targetAcademicYearId).toBe('ay-27-existing');
  });

  it('honours an explicitly supplied target academic year', async () => {
    prisma.academicYear.findUnique.mockResolvedValue({
      id: 'ay-explicit',
      label: '2028-29',
      startDate: new Date('2028-06-01'),
      endDate: new Date('2029-03-31'),
    });

    const result = await service.promoteTo2ndPuc(
      dto([SCI_A], { targetAcademicYearId: 'ay-explicit' }),
    );

    expect(result.targetAcademicYearLabel).toBe('2028-29');
    expect(prisma.academicYear.create).not.toHaveBeenCalled();
  });

  it('reports a missing target academic year rather than silently creating one', async () => {
    prisma.academicYear.findUnique.mockResolvedValue(null);

    await expect(
      service.promoteTo2ndPuc(dto([SCI_A], { targetAcademicYearId: 'nope' })),
    ).rejects.toThrow(NotFoundException);
  });

  it('writes nothing on a dry run but still resolves the plan', async () => {
    const result = await service.promoteTo2ndPuc(
      dto([SCI_A], { dryRun: true }),
    );

    expect(result.dryRun).toBe(true);
    expect(result.moved).toBe(0);
    expect(result.sections[0]).toMatchObject({
      sourceName: '1-SCI-A',
      targetName: '2-SCI-A',
      targetSectionId: '(would be created)',
      targetCreated: true,
      studentsToMove: 2,
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(sectionCreate).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('does not create the academic year on a dry run', async () => {
    // Caught against a real Postgres: the year used to be resolved (and
    // created) before the dry-run branch, so a preview left a real row behind.
    // A preview that writes is worse than no preview — the operator reasonably
    // believes nothing happened.
    const result = await service.promoteTo2ndPuc(
      dto([SCI_A], { dryRun: true }),
    );

    expect(prisma.academicYear.create).not.toHaveBeenCalled();
    // Still named, so the preview is useful.
    expect(result.targetAcademicYearLabel).toBe('2027-28');
    expect(result.targetAcademicYearId).toBe('(would be created)');
  });

  it('names a real target id on a dry run when the section already exists', async () => {
    prisma.section.findUnique.mockResolvedValue({ id: 'existing-2-sci-a' });

    const result = await service.promoteTo2ndPuc(
      dto([SCI_A], { dryRun: true }),
    );

    expect(result.sections[0].targetSectionId).toBe('existing-2-sci-a');
    expect(result.sections[0].targetCreated).toBe(false);
  });

  it('scopes the move to the source section as well as the student ids', async () => {
    await service.promoteTo2ndPuc(dto([SCI_A]));

    // Without the sectionId in the where clause, a student imported into a
    // different section between the read and the write would be swept up by a
    // stale id list.
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['u1', 'u2'] }, sectionId: SCI_A },
      data: { sectionId: 'new-SCI-A' },
    });
  });

  it('leaves deactivated students behind and says why', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'u1',
        sectionId: SCI_A,
        isActive: true,
        details: { name: 'Ananya' },
      },
      {
        id: 'u2',
        sectionId: SCI_A,
        isActive: true,
        details: { name: 'Rahul' },
      },
      {
        id: 'u3',
        sectionId: SCI_A,
        isActive: false,
        details: { name: 'Dropped Out' },
      },
    ]);

    const result = await service.promoteTo2ndPuc(dto([SCI_A]));

    expect(result.moved).toBe(2);
    expect(result.sections[0].skipped).toEqual([
      {
        name: 'Dropped Out',
        reason: 'account is deactivated, so it stays in 1st PUC',
      },
    ]);
    // Read the call back through a typed alias rather than nesting asymmetric
    // matchers, which are `any` and trip no-unsafe-assignment.
    const calls = updateMany.mock.calls as unknown as [
      { where: { id: { in: string[] }; sectionId: string } },
    ][];
    expect(calls[0][0].where.id.in).toEqual(['u1', 'u2']);
    expect(calls[0][0].where.sectionId).toBe(SCI_A);
  });

  it('promotes several sections independently, each to its own target', async () => {
    prisma.section.findMany.mockResolvedValue([
      section(SCI_A, '1-SCI-A', 'SCI-A'),
      section(COM_B, '1-COM-B', 'COM-B'),
    ]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'u1',
        sectionId: SCI_A,
        isActive: true,
        details: { name: 'Ananya' },
      },
      {
        id: 'u2',
        sectionId: SCI_A,
        isActive: true,
        details: { name: 'Rahul' },
      },
      {
        id: 'u3',
        sectionId: COM_B,
        isActive: true,
        details: { name: 'Priya' },
      },
    ]);

    const result = await service.promoteTo2ndPuc(dto([SCI_A, COM_B]));

    expect(result.moved).toBe(3);
    expect(
      result.sections.map((s) => [s.targetName, s.studentsToMove]),
    ).toEqual([
      ['2-SCI-A', 2],
      ['2-COM-B', 1],
    ]);
    // Each source resolves its own target, so no cohort can land in another's.
    expect(sectionCreate).toHaveBeenCalledTimes(2);
  });

  it('rejects a class-2 source section', async () => {
    prisma.section.findMany.mockResolvedValue([
      section('section-2-a', '2-SCI-A', 'SCI-A', '2'),
    ]);

    await expect(service.promoteTo2ndPuc(dto(['section-2-a']))).rejects.toThrow(
      /Only 1st-PUC sections can be promoted/,
    );
  });

  it('rejects source sections spanning different academic years', async () => {
    prisma.section.findMany.mockResolvedValue([
      section(SCI_A, '1-SCI-A', 'SCI-A'),
      {
        ...section(COM_B, '1-COM-B', 'COM-B'),
        academicYearId: 'ay-25',
        academicYear: { id: 'ay-25', label: '2025-26' },
      },
    ]);

    await expect(service.promoteTo2ndPuc(dto([SCI_A, COM_B]))).rejects.toThrow(
      /must share one academic year/,
    );
  });

  it('reports which section ids do not exist', async () => {
    await expect(
      service.promoteTo2ndPuc(dto([SCI_A, 'ghost-1', 'ghost-2'])),
    ).rejects.toThrow(/ghost-1, ghost-2/);
  });

  it('refuses when class 2 does not exist', async () => {
    prisma.class.findUnique.mockResolvedValue(null);

    await expect(service.promoteTo2ndPuc(dto([SCI_A]))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('never touches Auth, so a promoted student keeps their login id', async () => {
    // `nnpu1SB26KA018` freezes as a join record: joined 1st PUC in AY26. The
    // service has no Auth client at all, so this fails loudly if a future
    // change starts rewriting ids.
    //
    // Asserted by absence rather than by a spy because `prisma.auth` is not
    // even on the mock — touching it would throw rather than silently pass.
    (prisma as unknown as { auth: unknown }).auth = new Proxy(
      {},
      {
        get() {
          throw new Error('promotion must not access Auth');
        },
      },
    );

    const result = await service.promoteTo2ndPuc(dto([SCI_A]));

    expect(result.moved).toBe(2);
  });

  it('does not call updateMany for a source section with no active students', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'u3',
        sectionId: SCI_A,
        isActive: false,
        details: { name: 'Gone' },
      },
    ]);

    const result = await service.promoteTo2ndPuc(dto([SCI_A]));

    expect(result.moved).toBe(0);
    expect(result.sections[0].studentsToMove).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
    // The target section is still created, so a later import has somewhere to go.
    expect(sectionCreate).toHaveBeenCalled();
  });
});
