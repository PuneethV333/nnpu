/**
 * dummy.js — seed script for the current schema
 * All students/sections use: Combination = PCMB, SecondLanguage = Kannada
 *
 * Run with:
 *   node dummy.js
 *
 * Assumes:
 *   - Prisma client generated at ../../generated/prisma relative to prisma/models
 *     (adjust the require path below to match your actual generated client location)
 *   - DATABASE_URL is set in your environment / .env
 *   - bcrypt is installed (npm install bcrypt)
 */

require("dotenv/config");
const bcrypt = require("bcrypt");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("../generated/prisma/client"); // adjust path if needed

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = "password123"; // same for every dummy user, for easy testing

async function hash(pw) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("Seeding dummy data...");

  // ---------- School ----------
  const school = await prisma.school.create({
    data: {
      name: "NNPU College",
      noOfStudents: 0,
      noOfGirls: 0,
      noOfBoys: 0,
      noOfTeacher: 0,
    },
  });

  // ---------- Academic Year ----------
  const academicYear = await prisma.academicYear.create({
    data: {
      label: "2026-2027",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2027-04-30"),
    },
  });

  // ---------- Classes (1st PU / 2nd PU) ----------
  const class1 = await prisma.class.create({ data: { name: "1st PU" } });
  const class2 = await prisma.class.create({ data: { name: "2nd PU" } });

  // ---------- Combination: PCMB only ----------
  const combinationPCMB = await prisma.combination.create({
    data: {
      stream: "Science",
      code: "PCMB",
      idCode: "b",
      name: "Physics, Chemistry, Maths, Biology",
    },
  });

  // ---------- Subjects ----------
  const subjectNames = [
    "English",
    "Kannada",
    "Physics",
    "Chemistry",
    "Mathematics",
    "Biology",
  ];
  const subjects = {};
  for (const name of subjectNames) {
    subjects[name] = await prisma.subject.create({ data: { name } });
  }

  // ---------- Sections: 1st PU PCMB-Kannada-A, 2nd PU PCMB-Kannada-A ----------
  const section1 = await prisma.section.create({
    data: {
      name: "A",
      classId: class1.id,
      combinationId: combinationPCMB.id,
      language: "Kannada",
      session: "A",
      academicYearId: academicYear.id,
    },
  });

  const section2 = await prisma.section.create({
    data: {
      name: "A",
      classId: class2.id,
      combinationId: combinationPCMB.id,
      language: "Kannada",
      session: "A",
      academicYearId: academicYear.id,
    },
  });

  // ---------- Calendar days (a small sample, not the full year) ----------
  await prisma.academicCalendarDay.createMany({
    data: [
      { date: new Date("2026-07-06"), type: "Weekend" },
      { date: new Date("2026-07-07"), type: "Working" },
      { date: new Date("2026-07-08"), type: "Working" },
      { date: new Date("2026-07-09"), type: "Working" },
      { date: new Date("2026-07-10"), type: "Holiday", label: "Founders Day" },
      {
        date: new Date("2026-07-13"),
        type: "Exam",
        label: "Unit Test 1 - Physics",
      },
    ],
    skipDuplicates: true,
  });

  // ---------- Admin ----------
  const adminPassword = await hash(DEFAULT_PASSWORD);
  const admin = await prisma.user.create({
    data: {
      role: "Admin",
      school: { connect: { id: school.id } },
      auth: { create: { authId: "nnpuadmin1", password: adminPassword } },
      details: { create: { name: "Admin User", profilePic: "" } },
    },
    include: { auth: true },
  });

  // ---------- Teachers ----------
  const teacherDefs = [
    { name: "Ramesh Rao", subject: "Physics", section: section1 },
    { name: "Sunita Shetty", subject: "Chemistry", section: section1 },
    { name: "Manjunath Gowda", subject: "Mathematics", section: section2 },
    { name: "Lakshmi Bhat", subject: "Biology", section: section2 },
  ];

  const teachers = [];
  let teacherSerial = 1;
  for (const def of teacherDefs) {
    const authId = `nnputeacher${teacherSerial}`;
    const teacherPassword = await hash(DEFAULT_PASSWORD);

    const teacher = await prisma.user.create({
      data: {
        role: "Teacher",
        school: { connect: { id: school.id } },
        auth: { create: { authId, password: teacherPassword } },
        details: { create: { name: def.name, profilePic: "" } },
      },
    });

    await prisma.sectionSubject.create({
      data: {
        sectionId: def.section.id,
        subjectId: subjects[def.subject].id,
        teacherId: teacher.id,
      },
    });

    teachers.push({ ...def, teacher });
    teacherSerial++;
  }

  // Assign first teacher of each section as the class teacher
  await prisma.section.update({
    where: { id: section1.id },
    data: { classTeacherId: teachers[0].teacher.id },
  });
  await prisma.section.update({
    where: { id: section2.id },
    data: { classTeacherId: teachers[2].teacher.id },
  });

  // ---------- Students ----------
  // authId format: nnpu{puYear}{stream}{combo}{joinYear}{lang}{session}{serial}
  // e.g. nnpu1sb26ka1
  async function createStudents(section, puYear, count) {
    const students = [];
    for (let i = 1; i <= count; i++) {
      const authId = `nnpu${puYear}sb26ka${i}`; // s=Science, b=PCMB, 26=2026, k=Kannada, a=session A
      const studentPassword = await hash(DEFAULT_PASSWORD);

      const student = await prisma.user.create({
        data: {
          role: "Student",
          school: { connect: { id: school.id } },
          section: { connect: { id: section.id } },
          auth: { create: { authId, password: studentPassword } },
          details: {
            create: { name: `Student ${puYear}-${i}`, profilePic: "" },
          },
        },
      });

      students.push(student);
    }
    return students;
  }

  const section1Students = await createStudents(section1, 1, 5);
  const section2Students = await createStudents(section2, 2, 5);

  // ---------- Attendance rows for today, all NotMarked (matches the "roster on demand" design) ----------
  const today = new Date("2026-07-09");

  const allRosterRows = [
    ...section1Students.map((s) => ({
      studentId: s.id,
      sectionId: section1.id,
      date: today,
      status: "NotMarked",
    })),
    ...section2Students.map((s) => ({
      studentId: s.id,
      sectionId: section2.id,
      date: today,
      status: "NotMarked",
    })),
  ];

  await prisma.attendance.createMany({
    data: allRosterRows,
    skipDuplicates: true,
  });

  // ---------- Update School counts ----------
  await prisma.school.update({
    where: { id: school.id },
    data: {
      noOfStudents: section1Students.length + section2Students.length,
      noOfTeacher: teachers.length,
    },
  });

  console.log("Seed complete:");
  console.log(
    `  Admin login:   authId=nnpuadmin1        password=${DEFAULT_PASSWORD}`,
  );
  console.log(
    `  Teacher login: authId=nnputeacher1..4    password=${DEFAULT_PASSWORD}`,
  );
  console.log(
    `  Student login: authId=nnpu1sb26ka1..5 / nnpu2sb26ka1..5   password=${DEFAULT_PASSWORD}`,
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
