/**
 * dummy.ts — NNPU School Seed Script
 *
 * Run with:  npx ts-node -r tsconfig-paths/register dummy.ts
 * (place this file at the project root alongside prisma/schema.prisma)
 *
 * What this seeds
 * ───────────────
 * 1.  School           — "NNPU College"
 * 2.  Academic Year    — 2026-27  (active today)
 * 3.  Classes          — "1"  and  "2"  (matches classYear '1' / '2' used in auth-id logic)
 * 4.  Combinations     — PCMB, PCMC (Science) · CEBA, SEBA (Commerce)
 * 5.  Subjects         — all subjects used across both streams
 * 6.  Sections         — class 1 + 2  ×  sessions A & B  (4 sections total)
 * 7.  Teachers         — 20 teachers, each assigned to section-subjects; class teachers set
 * 8.  Admins           — 2 admins
 * 9.  Students         — 500 students spread across 4 sections / 4 combos / 3 languages
 * 10. Periods          — Science & Commerce period grids
 * 11. Timetable        — unique full-week timetable for every section
 * 12. Calendar         — full 2026 calendar with Indian academic holidays / events
 *
 * Auth-id patterns (matches onboarding.service.ts exactly)
 * ─────────────────────────────────────────────────────────
 * Student : nnpu{classYear}{streamCode}{comboCode}{joinYear2}{langCode}{session}{serial:3}
 *           e.g. nnpuSB26KA001
 * Teacher : nnpuT{joinYear2}{serial:3}  e.g. nnpuT26001
 * Admin   : nnpuA{joinYear2}{serial:3}  e.g. nnpuA26001
 *
 * Codes
 *   stream  : Science→S  Commerce→C
 *   combo   : PCMB→B  PCMC→C  CEBA→C  SEBA→S
 *   language: Kannada→K  Hindi→H  Sanskrit→S
 */

import { PrismaClient } from '@/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ─── helpers ─────────────────────────────────────────────────────────────────

function pad(n: number, width = 3) {
  return String(n).padStart(width, '0');
}

/** Combine a date-only string into a proper UTC midnight Date for @db.Date fields */
function date(iso: string) {
  return new Date(iso + 'T00:00:00.000Z');
}

/** Build a Time-only Date for @db.Time fields (date part is ignored by Postgres) */
function time(hh: number, mm: number) {
  const d = new Date(0);
  d.setUTCHours(hh, mm, 0, 0);
  return d;
}

async function hashPw(plain: string) {
  return bcrypt.hash(plain, 10);
}

// ─── constants ───────────────────────────────────────────────────────────────

const SCHOOL_NAME = 'NNPU College';
const AY_LABEL = '2026-27';
const AY_START = '2026-06-01';
const AY_END = '2027-03-31';
const JOIN_YEAR2 = '26'; // last 2 digits of academic-year start
const DEFAULT_PW = 'nnpu123';
const PIC = '';

// Combination definitions (must match schema: code @unique, idCode+stream @unique)
const COMBOS = [
  {
    stream: 'Science' as const,
    code: 'PCMB',
    idCode: 'PCMB',
    name: 'Physics Chemistry Maths Biology',
  },
  {
    stream: 'Science' as const,
    code: 'PCMC',
    idCode: 'PCMC',
    name: 'Physics Chemistry Maths Computer Science',
  },
  {
    stream: 'Commerce' as const,
    code: 'CEBA',
    idCode: 'CEBA',
    name: 'Commerce Economics Business Accountancy',
  },
  {
    stream: 'Commerce' as const,
    code: 'SEBA',
    idCode: 'SEBA',
    name: 'Statistics Economics Business Accountancy',
  },
] as const;

// comboCode map (mirrors helper.ts)
const COMBO_CODE: Record<string, string> = {
  PCMB: 'B',
  PCMC: 'C',
  CEBA: 'C',
  SEBA: 'S',
};
const STREAM_CODE: Record<string, string> = { Science: 'S', Commerce: 'C' };
const LANG_CODE: Record<string, string> = {
  Kannada: 'K',
  Hindi: 'H',
  Sanskrit: 'S',
};

type Language = 'Kannada' | 'Hindi' | 'Sanskrit';
const LANGUAGES: Language[] = ['Kannada', 'Hindi', 'Sanskrit'];

// Subject list
const SCIENCE_SUBJECTS = [
  'Physics',
  'Chemistry',
  'Mathematics',
  'Biology',
  'Computer Science',
  'English',
];
const COMMERCE_SUBJECTS = [
  'Commerce',
  'Economics',
  'Business Studies',
  'Accountancy',
  'Statistics',
  'English',
];
const ALL_SUBJECTS = [...new Set([...SCIENCE_SUBJECTS, ...COMMERCE_SUBJECTS])];

// Teacher names (20)
const TEACHER_NAMES = [
  'Ananya Sharma',
  'Bhavana Rao',
  'Chetan Kumar',
  'Deepa Nair',
  'Eswara Reddy',
  'Fathima Begum',
  'Ganesh Murthy',
  'Harini Suresh',
  'Ishaan Joshi',
  'Jayashree Patil',
  'Kiran Hegde',
  'Lakshmi Prasad',
  'Manjunath Gowda',
  'Nalini Krishnan',
  'Omkar Desai',
  'Preethi Venkat',
  'Qureshi Imran',
  'Radha Bhat',
  'Suresh Naik',
  'Tejaswini Kulkarni',
];

// Admin names (2)
const ADMIN_NAMES = ['Ashwin Prabhu', 'Sunita Iyer'];

// Student first/last name pools
const FIRST_NAMES = [
  'Aarav',
  'Aditi',
  'Akash',
  'Amrita',
  'Arun',
  'Bhavya',
  'Chirag',
  'Deepak',
  'Diya',
  'Esha',
  'Farhan',
  'Geetha',
  'Harsh',
  'Ishita',
  'Jayanth',
  'Kavya',
  'Kiran',
  'Lavanya',
  'Madhav',
  'Nandini',
  'Nikhil',
  'Pallavi',
  'Pooja',
  'Pranav',
  'Priya',
  'Rahul',
  'Rajesh',
  'Ramya',
  'Rohan',
  'Sahana',
  'Sanjay',
  'Shilpa',
  'Shruti',
  'Siddharth',
  'Sneha',
  'Soumya',
  'Suhas',
  'Supriya',
  'Tejas',
  'Usha',
  'Varun',
  'Vidya',
  'Vijay',
  'Vikas',
  'Vinay',
  'Vishal',
  'Yamini',
  'Yogesh',
  'Zoya',
  'Arjun',
  'Meera',
  'Rohit',
  'Tanvi',
  'Karthik',
  'Divya',
  'Aditya',
  'Swathi',
  'Manoj',
  'Sangeetha',
  'Prakash',
  'Bindhu',
  'Chandan',
  'Dhanya',
  'Girish',
  'Hema',
  'Indu',
  'Jayesh',
  'Keerthi',
  'Lohith',
  'Megha',
  'Naveen',
  'Ojas',
  'Padmavathi',
  'Rajan',
  'Saritha',
  'Tanu',
  'Umesh',
  'Vaishnavi',
  'Wasim',
  'Xena',
  'Yatin',
  'Archana',
  'Basavraj',
  'Chandrika',
  'Devika',
  'Ekta',
  'Faniya',
  'Goutham',
  'Hemanth',
  'Irfan',
  'Jyothi',
  'Krishna',
  'Latha',
  'Mithun',
  'Nagesh',
  'Omshree',
  'Pavan',
  'Quasar',
  'Ruchika',
  'Shivam',
];
const LAST_NAMES = [
  'Sharma',
  'Rao',
  'Kumar',
  'Nair',
  'Reddy',
  'Patel',
  'Gowda',
  'Hegde',
  'Joshi',
  'Patil',
  'Verma',
  'Singh',
  'Iyer',
  'Krishnan',
  'Bhat',
  'Naik',
  'Desai',
  'Murthy',
  'Prasad',
  'Venkat',
  'Das',
  'Ghosh',
  'Menon',
  'Pillai',
  'Kaur',
  'Mishra',
  'Gupta',
  'Shukla',
  'Thakur',
  'Shetty',
  'Naidu',
  'Rajan',
  'Acharya',
  'Deshpande',
  'Kulkarni',
  'Jain',
  'Sethi',
  'Kapoor',
  'Malhotra',
  'Pandey',
];

function studentName(idx: number) {
  return `${FIRST_NAMES[idx % FIRST_NAMES.length]} ${LAST_NAMES[idx % LAST_NAMES.length]}`;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting NNPU seed...\n');

  // ── 1. School ──────────────────────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { id: 'seed-school-nnpu' },
    update: { name: SCHOOL_NAME },
    create: { id: 'seed-school-nnpu', name: SCHOOL_NAME },
  });
  console.log(`✅ School: ${school.name}  (id: ${school.id})`);

  // ── 2. Academic year ──────────────────────────────────────────────────────
  const academicYear = await prisma.academicYear.upsert({
    where: { label: AY_LABEL },
    update: {},
    create: {
      label: AY_LABEL,
      startDate: date(AY_START),
      endDate: date(AY_END),
    },
  });
  console.log(`✅ Academic Year: ${academicYear.label}`);

  // ── 3. Classes ("1" and "2") ──────────────────────────────────────────────
  const classMap: Record<string, string> = {};
  for (const name of ['1', '2']) {
    const cls = await prisma.class.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    classMap[name] = cls.id;
  }
  console.log(`✅ Classes: 1, 2`);

  // ── 4. Combinations ───────────────────────────────────────────────────────
  const comboMap: Record<string, string> = {}; // idCode → id
  for (const c of COMBOS) {
    const combo = await prisma.combination.upsert({
      where: { code: c.code },
      update: {},
      create: {
        stream: c.stream,
        code: c.code,
        idCode: c.idCode,
        name: c.name,
      },
    });
    comboMap[c.idCode] = combo.id;
  }
  console.log(`✅ Combinations: PCMB, PCMC, CEBA, SEBA`);

  // ── 5. Subjects ───────────────────────────────────────────────────────────
  const subjectMap: Record<string, string> = {}; // name → id
  for (const name of ALL_SUBJECTS) {
    const hasPractical = [
      'Physics',
      'Chemistry',
      'Biology',
      'Computer Science',
    ].includes(name);
    const sub = await prisma.subject.upsert({
      where: { name },
      update: {},
      create: { name, hasPractical },
    });
    subjectMap[name] = sub.id;
  }
  console.log(`✅ Subjects: ${Object.keys(subjectMap).join(', ')}`);

  // ── 6. Sections — 4 total (1-A, 1-B, 2-A, 2-B) ───────────────────────────
  // session A = Science half, session B = Commerce half (by convention)
  const sectionMap: Record<string, string> = {}; // "classYear-session" → id
  const sectionSessions = [
    { classYear: '1', session: 'A', name: '1-A' },
    { classYear: '1', session: 'B', name: '1-B' },
    { classYear: '2', session: 'A', name: '2-A' },
    { classYear: '2', session: 'B', name: '2-B' },
  ];
  for (const s of sectionSessions) {
    const existing = await prisma.section.findUnique({
      where: {
        classId_session_academicYearId: {
          classId: classMap[s.classYear],
          session: s.session,
          academicYearId: academicYear.id,
        },
      },
    });
    if (existing) {
      sectionMap[`${s.classYear}-${s.session}`] = existing.id;
    } else {
      const sec = await prisma.section.create({
        data: {
          name: s.name,
          classId: classMap[s.classYear],
          session: s.session,
          academicYearId: academicYear.id,
        },
      });
      sectionMap[`${s.classYear}-${s.session}`] = sec.id;
    }
  }
  console.log(`✅ Sections: 1-A, 1-B, 2-A, 2-B`);

  // ── 7. Teachers (20) & Admins (2) ─────────────────────────────────────────
  const hashedPw = await hashPw(DEFAULT_PW);
  const teacherIds: string[] = [];

  for (let i = 0; i < TEACHER_NAMES.length; i++) {
    const serial = pad(i + 1);
    const authId = `nnpuT${JOIN_YEAR2}${serial}`;
    const existing = await prisma.auth.findUnique({ where: { authId } });
    if (existing) {
      await prisma.user.findUnique({
        where: { id: existing.userId },
      });
      teacherIds.push(existing.userId);
      console.log(`   ↩ Teacher already exists: ${authId}`);
      continue;
    }
    const user = await prisma.user.create({
      data: { role: 'Teacher', schoolId: school.id },
    });
    await prisma.auth.create({
      data: { userId: user.id, authId, password: hashedPw },
    });
    await prisma.personalDetails.create({
      data: {
        userId: user.id,
        name: TEACHER_NAMES[i],
        profilePic: PIC,
        email: `teacher${serial}@nnpu.edu`,
      },
    });
    teacherIds.push(user.id);
  }
  console.log(`✅ Teachers created: ${TEACHER_NAMES.length}`);

  const adminIds: string[] = [];
  for (let i = 0; i < ADMIN_NAMES.length; i++) {
    const serial = pad(i + 1);
    const authId = `nnpuA${JOIN_YEAR2}${serial}`;
    const existing = await prisma.auth.findUnique({ where: { authId } });
    if (existing) {
      adminIds.push(existing.userId);
      continue;
    }
    const user = await prisma.user.create({
      data: { role: 'Admin', schoolId: school.id },
    });
    await prisma.auth.create({
      data: { userId: user.id, authId, password: hashedPw },
    });
    await prisma.personalDetails.create({
      data: {
        userId: user.id,
        name: ADMIN_NAMES[i],
        profilePic: PIC,
        email: `admin${serial}@nnpu.edu`,
      },
    });
    adminIds.push(user.id);
  }
  console.log(`✅ Admins created: ${ADMIN_NAMES.length}`);

  // ── 8. Assign class teachers & section subjects ────────────────────────────
  // Teacher assignment plan:
  //   sec 1-A (Science)  → 5 teachers (t0-t4)
  //   sec 1-B (Commerce) → 5 teachers (t5-t9)
  //   sec 2-A (Science)  → 5 teachers (t10-t14)
  //   sec 2-B (Commerce) → 5 teachers (t15-t19)

  const sectionSubjectPlan: Array<{
    sectionKey: string;
    subjects: string[];
    teacherOffset: number;
    classTeacherIdx: number;
  }> = [
    {
      sectionKey: '1-A',
      subjects: SCIENCE_SUBJECTS,
      teacherOffset: 0,
      classTeacherIdx: 0,
    },
    {
      sectionKey: '1-B',
      subjects: COMMERCE_SUBJECTS,
      teacherOffset: 5,
      classTeacherIdx: 5,
    },
    {
      sectionKey: '2-A',
      subjects: SCIENCE_SUBJECTS,
      teacherOffset: 10,
      classTeacherIdx: 10,
    },
    {
      sectionKey: '2-B',
      subjects: COMMERCE_SUBJECTS,
      teacherOffset: 15,
      classTeacherIdx: 15,
    },
  ];

  for (const plan of sectionSubjectPlan) {
    const sectionId = sectionMap[plan.sectionKey];

    // Set class teacher (update section)
    const ctId = teacherIds[plan.classTeacherIdx];
    await prisma.section.update({
      where: { id: sectionId },
      data: { classTeacherId: ctId },
    });

    // Create SectionSubject entries
    for (let j = 0; j < plan.subjects.length; j++) {
      const subName = plan.subjects[j];
      const subjectId = subjectMap[subName];
      const teacherId = teacherIds[plan.teacherOffset + (j % 5)]; // 5 teachers per section

      await prisma.sectionSubject.upsert({
        where: { sectionId_subjectId: { sectionId, subjectId } },
        update: { teacherId },
        create: { sectionId, subjectId, teacherId },
      });
    }
  }
  console.log(`✅ Class teachers & section-subjects assigned`);

  // ── 9. Students — 500 across 4 sections ───────────────────────────────────
  // Distribution:
  //   sec 1-A  → 125 students  (PCMB ×50, PCMC ×75)
  //   sec 1-B  → 125 students  (CEBA ×65, SEBA ×60)
  //   sec 2-A  → 125 students  (PCMB ×50, PCMC ×75)
  //   sec 2-B  → 125 students  (CEBA ×65, SEBA ×60)

  interface StudentPlan {
    sectionKey: string;
    classYear: string;
    combos: Array<{ idCode: string; count: number }>;
  }

  const studentPlan: StudentPlan[] = [
    {
      sectionKey: '1-A',
      classYear: '1',
      combos: [
        { idCode: 'PCMB', count: 50 },
        { idCode: 'PCMC', count: 75 },
      ],
    },
    {
      sectionKey: '1-B',
      classYear: '1',
      combos: [
        { idCode: 'CEBA', count: 65 },
        { idCode: 'SEBA', count: 60 },
      ],
    },
    {
      sectionKey: '2-A',
      classYear: '2',
      combos: [
        { idCode: 'PCMB', count: 50 },
        { idCode: 'PCMC', count: 75 },
      ],
    },
    {
      sectionKey: '2-B',
      classYear: '2',
      combos: [
        { idCode: 'CEBA', count: 65 },
        { idCode: 'SEBA', count: 60 },
      ],
    },
  ];

  // IdSequence counters (mirrors onboarding.service.ts bucket key logic)
  const seqCounters: Record<string, number> = {};
  function nextSerial(bucketKey: string) {
    seqCounters[bucketKey] = (seqCounters[bucketKey] ?? 0) + 1;
    return seqCounters[bucketKey];
  }

  // Upsert IdSequence rows after seeding so the DB counter stays consistent
  async function flushSequences() {
    for (const [id, lastValue] of Object.entries(seqCounters)) {
      await prisma.idSequence.upsert({
        where: { id },
        update: { lastValue },
        create: { id, lastValue },
      });
    }
  }

  let totalStudents = 0;
  let studentGlobalIdx = 0;

  for (const plan of studentPlan) {
    const sectionId = sectionMap[plan.sectionKey];
    const session = plan.sectionKey.split('-')[1]; // 'A' or 'B'

    for (const { idCode, count } of plan.combos) {
      const combo = COMBOS.find((c) => c.idCode === idCode)!;
      const streamCode = STREAM_CODE[combo.stream];
      const comboCode = COMBO_CODE[idCode];
      const combinationId = comboMap[idCode];

      for (let i = 0; i < count; i++) {
        const language = LANGUAGES[i % LANGUAGES.length];
        const langCode = LANG_CODE[language];

        const bucketKey = `nnpu-${plan.classYear}-${streamCode}-${comboCode}-${JOIN_YEAR2}-${langCode}-${session}`;
        const serial = pad(nextSerial(bucketKey));
        const authId = `nnpu${plan.classYear}${streamCode}${comboCode}${JOIN_YEAR2}${langCode}${session}${serial}`;

        // Check idempotency
        const existing = await prisma.auth.findUnique({ where: { authId } });
        if (existing) continue;

        const name = studentName(studentGlobalIdx++);
        const emailLocal = authId.toLowerCase();

        const user = await prisma.user.create({
          data: {
            role: 'Student',
            schoolId: school.id,
            sectionId: sectionId,
            combinationId: combinationId,
            language: language,
          },
        });

        await prisma.auth.create({
          data: { userId: user.id, authId, password: hashedPw },
        });

        await prisma.personalDetails.create({
          data: {
            userId: user.id,
            name,
            profilePic: PIC,
            email: `${emailLocal}@nnpu.edu`,
          },
        });

        totalStudents++;
      }
    }
  }

  await flushSequences();
  console.log(`✅ Students seeded: ${totalStudents}`);

  // Update school counters
  await prisma.school.update({
    where: { id: school.id },
    data: {
      noOfStudents: totalStudents,
      noOfTeacher: TEACHER_NAMES.length,
      noOfBoys: Math.floor(totalStudents / 2),
      noOfGirls: totalStudents - Math.floor(totalStudents / 2),
    },
  });

  // ── 10. Periods ───────────────────────────────────────────────────────────
  // Science:  8 teaching periods + 1 break  (order 1-9)
  // Commerce: 7 teaching periods + 1 break  (order 1-8)
  // Using disjoint order ranges so the Period.order @unique constraint holds.

  const sciPeriodDefs = [
    { order: 1, start: [8, 0], end: [8, 45], isBreak: false },
    { order: 2, start: [8, 45], end: [9, 30], isBreak: false },
    { order: 3, start: [9, 30], end: [10, 15], isBreak: false },
    { order: 4, start: [10, 15], end: [10, 30], isBreak: true, label: 'Break' },
    { order: 5, start: [10, 30], end: [11, 15], isBreak: false },
    { order: 6, start: [11, 15], end: [12, 0], isBreak: false },
    { order: 7, start: [12, 0], end: [12, 45], isBreak: false },
    { order: 8, start: [12, 45], end: [13, 30], isBreak: false },
    { order: 9, start: [13, 30], end: [14, 15], isBreak: false },
  ];

  const comPeriodDefs = [
    { order: 10, start: [8, 0], end: [8, 50], isBreak: false },
    { order: 11, start: [8, 50], end: [9, 40], isBreak: false },
    { order: 12, start: [9, 40], end: [10, 30], isBreak: false },
    {
      order: 13,
      start: [10, 30],
      end: [10, 45],
      isBreak: true,
      label: 'Break',
    },
    { order: 14, start: [10, 45], end: [11, 35], isBreak: false },
    { order: 15, start: [11, 35], end: [12, 25], isBreak: false },
    { order: 16, start: [12, 25], end: [13, 15], isBreak: false },
    { order: 17, start: [13, 15], end: [14, 5], isBreak: false },
  ];

  const sciPeriodIds: string[] = [];
  for (const p of sciPeriodDefs) {
    const existing = await prisma.period.findUnique({
      where: { order: p.order },
    });
    const row =
      existing ??
      (await prisma.period.create({
        data: {
          stream: 'Science',
          order: p.order,
          startTime: time(p.start[0], p.start[1]),
          endTime: time(p.end[0], p.end[1]),
          isBreak: p.isBreak,
          label: p.label ?? null,
        },
      }));
    if (!p.isBreak) sciPeriodIds.push(row.id);
  }

  const comPeriodIds: string[] = [];
  for (const p of comPeriodDefs) {
    const existing = await prisma.period.findUnique({
      where: { order: p.order },
    });
    const row =
      existing ??
      (await prisma.period.create({
        data: {
          stream: 'Commerce',
          order: p.order,
          startTime: time(p.start[0], p.start[1]),
          endTime: time(p.end[0], p.end[1]),
          isBreak: p.isBreak,
          label: p.label ?? null,
        },
      }));
    if (!p.isBreak) comPeriodIds.push(row.id);
  }
  console.log(`✅ Periods created`);

  // ── 11. Timetables ─────────────────────────────────────────────────────────
  // Each section gets a Timetable row + TimetableSlots for Mon–Sat
  // Science sections  (1-A, 2-A): 8 teaching periods / day
  // Commerce sections (1-B, 2-B): 7 teaching periods / day
  //
  // Science period assignment per day (period index → subject):
  //   0=English, 1=Physics, 2=Chemistry, 3=Maths, 4=<combo-split>, 5=Physics, 6=Maths, 7=Chemistry
  // Commerce period assignment per day:
  //   0=English, 1=Commerce, 2=Economics, 3=Accountancy, 4=<combo-split>, 5=Commerce, 6=Accountancy

  const DAYS = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ] as const;

  // Science timetable per day (period slot → subject name)
  // slot 4 (index) is the "combination-split" slot: PCMB→Biology, PCMC→Computer Science
  const SCI_DAY_SUBJECTS = [
    'English',
    'Physics',
    'Chemistry',
    'Mathematics',
    '__combo__', // split slot
    'Physics',
    'Mathematics',
    'Chemistry',
  ];

  // Commerce timetable per day
  // slot 4 is the "combination-split" slot: CEBA→Commerce, SEBA→Statistics
  const COM_DAY_SUBJECTS = [
    'English',
    'Commerce',
    'Economics',
    'Accountancy',
    '__combo__',
    'Commerce',
    'Accountancy',
  ];

  interface TTPlan {
    sectionKey: string;
    periodIds: string[];
    daySubjects: string[];
    teacherOffset: number;
    scienceStream: boolean;
  }

  const ttPlans: TTPlan[] = [
    {
      sectionKey: '1-A',
      periodIds: sciPeriodIds,
      daySubjects: SCI_DAY_SUBJECTS,
      teacherOffset: 0,
      scienceStream: true,
    },
    {
      sectionKey: '1-B',
      periodIds: comPeriodIds,
      daySubjects: COM_DAY_SUBJECTS,
      teacherOffset: 5,
      scienceStream: false,
    },
    {
      sectionKey: '2-A',
      periodIds: sciPeriodIds,
      daySubjects: SCI_DAY_SUBJECTS,
      teacherOffset: 10,
      scienceStream: true,
    },
    {
      sectionKey: '2-B',
      periodIds: comPeriodIds,
      daySubjects: COM_DAY_SUBJECTS,
      teacherOffset: 15,
      scienceStream: false,
    },
  ];

  for (const ttp of ttPlans) {
    const sectionId = sectionMap[ttp.sectionKey];

    // Upsert Timetable header
    const tt = await prisma.timetable.upsert({
      where: { sectionId },
      update: {},
      create: { sectionId },
    });

    // Combos active in this section
    const sectionCombos = ttp.scienceStream
      ? [
          { idCode: 'PCMB', comboSubject: 'Biology' },
          { idCode: 'PCMC', comboSubject: 'Computer Science' },
        ]
      : [
          { idCode: 'CEBA', comboSubject: 'Commerce' },
          { idCode: 'SEBA', comboSubject: 'Statistics' },
        ];

    // Teacher lookup helper
    function teacherForSubject(subjectName: string): string | null {
      const subjects = ttp.scienceStream ? SCIENCE_SUBJECTS : COMMERCE_SUBJECTS;
      const idx = subjects.indexOf(subjectName);
      if (idx < 0) return null;
      return teacherIds[ttp.teacherOffset + (idx % 5)];
    }

    for (const day of DAYS) {
      for (let pi = 0; pi < ttp.periodIds.length; pi++) {
        const periodId = ttp.periodIds[pi];
        const subjectName = ttp.daySubjects[pi];

        if (subjectName === '__combo__') {
          // Create one slot per combination in this section
          for (const { idCode, comboSubject } of sectionCombos) {
            const subjectId = subjectMap[comboSubject];
            const combinationId = comboMap[idCode];
            const teacherId = teacherForSubject(comboSubject);

            // Avoid duplicate slots
            const exists = await prisma.timetableSlot.findFirst({
              where: { sectionId, periodId, day, combinationId },
            });
            if (!exists) {
              await prisma.timetableSlot.create({
                data: {
                  sectionId,
                  periodId,
                  day,
                  subjectId,
                  combinationId,
                  teacherId: teacherId ?? undefined,
                  timetableId: tt.id,
                },
              });
            }
          }
        } else {
          const subjectId = subjectMap[subjectName];
          const teacherId = teacherForSubject(subjectName);

          const exists = await prisma.timetableSlot.findFirst({
            where: { sectionId, periodId, day, combinationId: null },
          });
          if (!exists) {
            await prisma.timetableSlot.create({
              data: {
                sectionId,
                periodId,
                day,
                subjectId,
                teacherId: teacherId ?? undefined,
                timetableId: tt.id,
              },
            });
          }
        }
      }
    }
  }
  console.log(`✅ Timetables created for all 4 sections`);

  // ── 12. Academic Calendar 2026 ────────────────────────────────────────────
  // Build full year with Indian PU college holidays + events
  type DayType = 'Working' | 'Holiday' | 'Exam' | 'Event' | 'Weekend';

  const overrides: Array<{ date: string; type: DayType; label: string }> = [
    // Public Holidays
    { date: '2026-01-01', type: 'Holiday', label: "New Year's Day" },
    { date: '2026-01-14', type: 'Holiday', label: 'Makara Sankranti / Pongal' },
    { date: '2026-01-26', type: 'Holiday', label: 'Republic Day' },
    {
      date: '2026-02-19',
      type: 'Holiday',
      label: 'Chhatrapati Shivaji Maharaj Jayanti',
    },
    { date: '2026-03-05', type: 'Holiday', label: 'Maha Shivaratri' },
    { date: '2026-03-25', type: 'Holiday', label: 'Holi' },
    { date: '2026-03-29', type: 'Holiday', label: 'Ram Navami' },
    { date: '2026-04-02', type: 'Holiday', label: 'Good Friday' },
    { date: '2026-04-14', type: 'Holiday', label: 'Dr Ambedkar Jayanti' },
    {
      date: '2026-05-01',
      type: 'Holiday',
      label: 'Karnataka Rajyotsava / May Day',
    },
    { date: '2026-06-15', type: 'Holiday', label: 'Eid ul-Adha' },
    { date: '2026-08-15', type: 'Holiday', label: 'Independence Day' },
    { date: '2026-08-25', type: 'Holiday', label: 'Ganesh Chaturthi' },
    { date: '2026-09-16', type: 'Holiday', label: 'Milad-un-Nabi' },
    { date: '2026-10-02', type: 'Holiday', label: 'Gandhi Jayanti' },
    { date: '2026-10-20', type: 'Holiday', label: 'Vijayadashami (Dasara)' },
    { date: '2026-11-01', type: 'Holiday', label: 'Kannada Rajyotsava' },
    {
      date: '2026-11-08',
      type: 'Holiday',
      label: 'Diwali / Naraka Chaturdashi',
    },
    { date: '2026-11-09', type: 'Holiday', label: 'Diwali / Balipadyami' },
    { date: '2026-12-25', type: 'Holiday', label: 'Christmas Day' },

    // School Events
    {
      date: '2026-06-01',
      type: 'Event',
      label: 'First Day of Academic Year 2026-27',
    },
    {
      date: '2026-06-05',
      type: 'Event',
      label: 'World Environment Day — Plantation Drive',
    },
    { date: '2026-07-15', type: 'Event', label: 'Sports Day' },
    {
      date: '2026-08-10',
      type: 'Event',
      label: 'Independence Day Celebration & Flag Hoisting',
    },
    { date: '2026-09-05', type: 'Event', label: "Teachers' Day" },
    { date: '2026-10-05', type: 'Event', label: 'Annual Science Exhibition' },
    {
      date: '2026-11-14',
      type: 'Event',
      label: "Children's Day — Cultural Programme",
    },
    {
      date: '2026-12-10',
      type: 'Event',
      label: 'Annual Day & Prize Distribution',
    },
    {
      date: '2027-01-26',
      type: 'Event',
      label: 'Republic Day Parade & Celebration',
    },
    { date: '2027-02-14', type: 'Event', label: 'Farewell — Class 2 Students' },

    // Examinations
    {
      date: '2026-07-20',
      type: 'Exam',
      label: 'Unit Test 1 — Class 1 (Theory)',
    },
    {
      date: '2026-07-21',
      type: 'Exam',
      label: 'Unit Test 1 — Class 2 (Theory)',
    },
    { date: '2026-07-22', type: 'Exam', label: 'Unit Test 1 — Practical Day' },
    { date: '2026-09-14', type: 'Exam', label: 'Mid-Term Exam — Day 1' },
    { date: '2026-09-15', type: 'Exam', label: 'Mid-Term Exam — Day 2' },
    { date: '2026-09-16', type: 'Exam', label: 'Mid-Term Exam — Day 3' },
    { date: '2026-09-17', type: 'Exam', label: 'Mid-Term Exam — Day 4' },
    { date: '2026-09-18', type: 'Exam', label: 'Mid-Term Practical Exam' },
    {
      date: '2026-11-23',
      type: 'Exam',
      label: 'Unit Test 2 — Class 1 (Theory)',
    },
    {
      date: '2026-11-24',
      type: 'Exam',
      label: 'Unit Test 2 — Class 2 (Theory)',
    },
    { date: '2026-11-25', type: 'Exam', label: 'Unit Test 2 — Practical Day' },
    {
      date: '2027-01-05',
      type: 'Exam',
      label: 'Pre-Board / Annual Exam — Day 1',
    },
    {
      date: '2027-01-06',
      type: 'Exam',
      label: 'Pre-Board / Annual Exam — Day 2',
    },
    {
      date: '2027-01-07',
      type: 'Exam',
      label: 'Pre-Board / Annual Exam — Day 3',
    },
    {
      date: '2027-01-08',
      type: 'Exam',
      label: 'Pre-Board / Annual Exam — Day 4',
    },
    {
      date: '2027-01-09',
      type: 'Exam',
      label: 'Pre-Board / Annual Exam — Practical Day',
    },
    {
      date: '2027-02-20',
      type: 'Exam',
      label: 'PU Board Practical Exam Begins',
    },
    { date: '2027-03-01', type: 'Exam', label: 'PU Board Theory Exam Begins' },
    { date: '2027-03-20', type: 'Exam', label: 'PU Board Theory Exam Ends' },
  ];

  const overrideMap = new Map(overrides.map((o) => [o.date, o]));

  // Generate every day of 2026 (calendar year for the DB; AY spans into 2027 but we seed 2026)
  const calDays: Array<{ date: Date; type: DayType; label: string | null }> =
    [];
  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(Date.UTC(2026, month + 1, 0)).getUTCDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(Date.UTC(2026, month, day));
      const key = d.toISOString().split('T')[0];
      const dow = d.getUTCDay(); // 0=Sun, 6=Sat
      const isWeekend = dow === 0 || dow === 6;
      const override = overrideMap.get(key);
      calDays.push({
        date: d,
        type: override?.type ?? (isWeekend ? 'Weekend' : 'Working'),
        label: override?.label ?? null,
      });
    }
  }

  // Upsert in batches of 50 to stay within transaction limits
  for (let i = 0; i < calDays.length; i += 50) {
    const batch = calDays.slice(i, i + 50);
    await prisma.$transaction(
      batch.map((cd) =>
        prisma.academicCalendarDay.upsert({
          where: { date: cd.date },
          update: { type: cd.type, label: cd.label },
          create: cd,
        }),
      ),
    );
  }
  console.log(`✅ Calendar generated: ${calDays.length} days (2026)`);

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed complete!\n');
  console.log('Summary');
  console.log('───────');
  console.log(`School   : ${SCHOOL_NAME}`);
  console.log(`Acad Year: ${AY_LABEL}  (${AY_START} → ${AY_END})`);
  console.log(`Classes  : 1, 2`);
  console.log(
    `Sections : 1-A (Science), 1-B (Commerce), 2-A (Science), 2-B (Commerce)`,
  );
  console.log(`Combos   : PCMB · PCMC · CEBA · SEBA`);
  console.log(
    `Teachers : ${TEACHER_NAMES.length}   authIds nnpuT26001 → nnpuT26020`,
  );
  console.log(
    `Admins   : ${ADMIN_NAMES.length}    authIds nnpuA26001 → nnpuA26002`,
  );
  console.log(`Students : ${totalStudents}`);
  console.log(`Timetable: unique full-week grids for all 4 sections`);
  console.log(`Calendar : 365 days of 2026 with ${overrides.length} overrides`);
  console.log('\nSample authIds');
  console.log('─────────────────────────────────');
  console.log('Admin 1   : nnpuA26001  / nnpu123');
  console.log('Admin 2   : nnpuA26002  / nnpu123');
  console.log('Teacher 1 : nnpuT26001  / nnpu123');
  console.log('Teacher 20: nnpuT26020  / nnpu123');
  console.log('Student (1-A, PCMB, Kannada) : nnpu1SB26KA001  / nnpu123');
  console.log('Student (1-A, PCMC, Hindi)   : nnpu1SC26HA002  / nnpu123');
  console.log('Student (1-B, CEBA, Sanskrit): nnpu1CC26SA001  / nnpu123');
  console.log('Student (1-B, SEBA, Kannada) : nnpu1CS26KA001  / nnpu123');
  console.log('Student (2-A, PCMB, Kannada) : nnpu2SB26KA001  / nnpu123');
  console.log('Student (2-B, CEBA, Kannada) : nnpu2CC26KA001  / nnpu123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
