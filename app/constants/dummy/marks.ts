import { MarkArray } from '@/src/types/marks';

const now = new Date();

export const dummyMarks: MarkArray = [
  {
    id: 'm1',
    studentId: 's1',
    assessmentId: 'a1',
    marksObtained: 24,
    remarks: 'Outstanding',
    enteredById: 't1',
    createdAt: now,
    updatedAt: now,
    assessment: {
      id: 'a1',
      name: 'Unit Test 1',
      category: 'UnitTest',
      subjectId: 'sub-math',
      sectionId: 'sec1',
      maxMarks: 25,
      date: new Date('2026-07-10'),
      createdAt: now,
      updatedAt: now,
      subject: { id: 'sub-math', name: 'Mathematics', hasPractical: false, createdAt: now, updatedAt: now },
    },
  },
  {
    id: 'm2',
    studentId: 's1',
    assessmentId: 'a2',
    marksObtained: 19,
    remarks: 'Good, keep it up',
    enteredById: 't1',
    createdAt: now,
    updatedAt: now,
    assessment: {
      id: 'a2',
      name: 'Unit Test 1',
      category: 'UnitTest',
      subjectId: 'sub-eng',
      sectionId: 'sec1',
      maxMarks: 25,
      date: new Date('2026-07-10'),
      createdAt: now,
      updatedAt: now,
      subject: { id: 'sub-eng', name: 'English', hasPractical: false, createdAt: now, updatedAt: now },
    },
  },
  {
    id: 'm3',
    studentId: 's1',
    assessmentId: 'a3',
    marksObtained: 85,
    remarks: 'Highly methodical',
    enteredById: 't1',
    createdAt: now,
    updatedAt: now,
    assessment: {
      id: 'a3',
      name: 'Mid Term',
      category: 'MidTerm',
      subjectId: 'sub-phy',
      sectionId: 'sec1',
      maxMarks: 100,
      date: new Date('2026-07-15'),
      createdAt: now,
      updatedAt: now,
      subject: { id: 'sub-phy', name: 'Physics', hasPractical: true, createdAt: now, updatedAt: now },
    },
  },
  {
    id: 'm4',
    studentId: 's1',
    assessmentId: 'a4',
    marksObtained: 92,
    remarks: 'Exceptional math skills',
    enteredById: 't1',
    createdAt: now,
    updatedAt: now,
    assessment: {
      id: 'a4',
      name: 'Mid Term',
      category: 'MidTerm',
      subjectId: 'sub-math',
      sectionId: 'sec1',
      maxMarks: 100,
      date: new Date('2026-07-15'),
      createdAt: now,
      updatedAt: now,
      subject: { id: 'sub-math', name: 'Mathematics', hasPractical: false, createdAt: now, updatedAt: now },
    },
  },
];

// An assessment that exists (Chemistry Mid Term was conducted) but this
// student's mark hasn't been entered/published yet — demonstrates the
// "not updated" case. Normally your backend wouldn't return this via
// getMyMarks (since no Mark row exists), so this is modeled separately
// from `dummyMarks` and merged in the UI layer against a known assessment list.
export const dummyPendingAssessments = [
  {
    id: 'a5',
    name: 'Mid Term',
    category: 'MidTerm' as const,
    subjectName: 'Chemistry',
  },
];

// "No exam conducted" — Biology has no assessments at all for Unit Test category.
// Represented simply by its absence from both lists above; the UI's
// empty-category state handles this automatically.