import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PASSWORD = 'demo123';
const COURSE = 'B.Tech';
const BRANCH = 'CS';
const SEMESTER = 3;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromToday(n: number): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  // Wipe everything so the seed is re-runnable.
  await prisma.$transaction([
    prisma.refreshToken.deleteMany(),
    prisma.ticketMessage.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.feeStructureItem.deleteMany(),
    prisma.semesterResult.deleteMany(),
    prisma.marks.deleteMany(),
    prisma.exam.deleteMany(),
    prisma.submission.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.syllabusTopic.deleteMany(),
    prisma.timetableSlot.deleteMany(),
    prisma.bookIssue.deleteMany(),
    prisma.book.deleteMany(),
    prisma.documentRequest.deleteMany(),
    prisma.notice.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.studentProfile.deleteMany(),
    prisma.facultyProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ---- Users ----
  const admin = await prisma.user.create({
    data: { email: 'admin@erp.test', passwordHash, name: 'Administrator', role: 'ADMIN', phone: '9876543210' },
  });

  const facultyNames = ['Dr. Priya Iyer', 'Prof. Rohan Das'];
  const facultyUserIds: string[] = [];
  for (let i = 0; i < facultyNames.length; i++) {
    const u = await prisma.user.create({
      data: { email: `faculty${i + 1}@erp.test`, passwordHash, name: facultyNames[i]!, role: 'FACULTY' },
    });
    await prisma.facultyProfile.create({
      data: {
        userId: u.id,
        empId: `FAC-2024-10${i + 1}`,
        department: 'Computer Science',
        designation: i === 0 ? 'Associate Professor' : 'Assistant Professor',
      },
    });
    facultyUserIds.push(u.id);
  }

  const studentNames = [
    'Ananya Sharma',
    'Vivaan Kumar',
    'Diya Patel',
    'Arjun Mehta',
    'Ishita Verma',
    'Karan Singh',
    'Sneha Reddy',
    'Rahul Bose',
  ];
  const students: Array<{ user: { id: string; name: string }; index: number }> = [];
  for (let i = 0; i < studentNames.length; i++) {
    const u = await prisma.user.create({
      data: { email: `student${i + 1}@erp.test`, passwordHash, name: studentNames[i]!, role: 'STUDENT' },
    });
    await prisma.studentProfile.create({
      data: {
        userId: u.id,
        rollNo: `CS-2024-${String(i + 1).padStart(3, '0')}`,
        course: COURSE,
        branch: BRANCH,
        semester: SEMESTER,
        enrollmentYear: 2024,
      },
    });
    students.push({ user: { id: u.id, name: u.name }, index: i });
  }
  void admin;

  // ---- Subjects ----
  const subjectDefs = [
    { code: 'CS301', name: 'Database Systems', credits: 4, facultyIdx: 0 },
    { code: 'CS302', name: 'Data Structures & Algorithms', credits: 4, facultyIdx: 0 },
    { code: 'CS303', name: 'Operating Systems', credits: 4, facultyIdx: 1 },
    { code: 'CS304', name: 'Computer Networks', credits: 3, facultyIdx: 1 },
    { code: 'CS305', name: 'Software Engineering', credits: 3, facultyIdx: 0 },
    { code: 'CS306', name: 'Discrete Mathematics', credits: 4, facultyIdx: 1 },
  ];
  const subjects: Array<{ id: string; code: string; facultyId: string; index: number }> = [];
  for (const [si, def] of subjectDefs.entries()) {
    const s = await prisma.subject.create({
      data: {
        code: def.code,
        name: def.name,
        branch: BRANCH,
        semester: SEMESTER,
        credits: def.credits,
        facultyId: facultyUserIds[def.facultyIdx]!,
      },
    });
    subjects.push({ id: s.id, code: s.code, facultyId: s.facultyId, index: si });
  }

  // ---- Attendance (12 lessons per subject per student) ----
  const lessonDates: Date[] = [];
  for (let i = 0; i < 12; i++) lessonDates.push(daysFromToday(-(2 + i * 4)));

  for (const s of students) {
    const missed = ((s.index * 2 + 1) % 3); // 1..2
    const leaves = (s.index + 1) % 2 === 0 ? 1 : 0; // 0..1
    const presentCount = 12 - missed - leaves;
    for (const sub of subjects) {
      for (let li = 0; li < 12; li++) {
        const status = li < presentCount ? 'PRESENT' : li < presentCount + missed ? 'ABSENT' : 'LEAVE';
        await prisma.attendanceRecord.create({
          data: {
            studentId: s.user.id,
            subjectId: sub.id,
            date: lessonDates[li]!,
            status: status as 'PRESENT' | 'ABSENT' | 'LEAVE',
            markedById: sub.facultyId,
          },
        });
      }
    }
  }

  // ---- Exams & Marks ----
  const firstExamIdBySubject = new Map<string, string>();
  for (const sub of subjects) {
    const internal = await prisma.exam.create({
      data: {
        name: `${sub.code} Internal-1`,
        type: 'INTERNAL',
        course: COURSE,
        branch: BRANCH,
        semester: SEMESTER,
        subjectId: sub.id,
        date: daysFromToday(-40),
        maxMarks: 30,
      },
    });
    firstExamIdBySubject.set(sub.id, internal.id);
    const endsem = await prisma.exam.create({
      data: {
        name: `${sub.code} End Semester`,
        type: 'ENDSEM',
        course: COURSE,
        branch: BRANCH,
        semester: SEMESTER,
        subjectId: sub.id,
        date: daysFromToday(-8),
        maxMarks: 70,
      },
    });
    for (const s of students) {
      const internalScore = 18 + ((s.index * 5 + sub.index * 3) % 11); // 18..28
      const endScore = 48 + ((s.index * 7 + sub.index * 5) % 21); // 48..68
      await prisma.marks.create({ data: { studentId: s.user.id, examId: internal.id, obtained: internalScore } });
      await prisma.marks.create({ data: { studentId: s.user.id, examId: endsem.id, obtained: endScore } });
    }
  }

  // ---- Past semester results (for CGPA trend) ----
  for (const s of students) {
    for (const sem of [1, 2]) {
      const sgpa = 7.2 + ((s.index * 13 + sem * 7) % 16) / 10; // 7.2..8.7
      await prisma.semesterResult.create({
        data: { studentId: s.user.id, semester: sem, sgpa, credits: 20, attemptedCredit: 20 },
      });
    }
  }

  // ---- Assignments + a couple of submissions ----
  const assignmentDefs = [
    { subjectIdx: 0, title: 'ER Modeling Assignment', description: 'Design an ER diagram for a library management system.', dueDays: 10 },
    { subjectIdx: 1, title: 'Binary Tree Lab', description: 'Implement AVL insert/delete and pretty-print.', dueDays: 6 },
    { subjectIdx: 2, title: 'Process Scheduling Report', description: 'Compare FCFS, SJF and Round-Robin with examples.', dueDays: 14 },
  ];
  const assignmentIds: string[] = [];
  for (const def of assignmentDefs) {
    const a = await prisma.assignment.create({
      data: {
        subjectId: subjects[def.subjectIdx]!.id,
        facultyId: subjects[def.subjectIdx]!.facultyId,
        title: def.title,
        description: def.description,
        dueDate: daysFromToday(def.dueDays),
      },
    });
    assignmentIds.push(a.id);
  }
  // Student 1 submitted & graded; Student 2 submitted ungraded.
  await prisma.submission.create({
    data: { assignmentId: assignmentIds[0]!, studentId: students[0]!.user.id, fileUrl: '/uploads/demo-submission-1.pdf', grade: 85, feedback: 'Great work!' },
  });
  await prisma.submission.create({
    data: { assignmentId: assignmentIds[0]!, studentId: students[1]!.user.id, fileUrl: '/uploads/demo-submission-2.pdf' },
  });

  // ---- Notices ----
  const noticeSeed: Array<{ title: string; body: string; category: 'EXAM' | 'EVENT' | 'HOLIDAY' | 'GENERAL' }> = [
    { title: 'Internal Exam Schedule Released', body: 'Semester 3 internal assessments start next Monday. Please check the portal for your subject-wise schedule.', category: 'EXAM' },
    { title: 'TechFest 2026', body: 'Annual technical festival registrations are open until the end of this month.', category: 'EVENT' },
    { title: 'Upcoming Holiday', body: 'The institute remains closed this Friday on the occasion of the regional festival.', category: 'HOLIDAY' },
    { title: 'Library Additions', body: 'New titles in computer networks and cryptography are now available for issue.', category: 'GENERAL' },
    { title: 'Fee Due Reminder', body: 'Please clear pending fees before the end of the month to avoid late payment charges.', category: 'GENERAL' },
  ];
  for (const n of noticeSeed) {
    await prisma.notice.create({ data: { title: n.title, body: n.body, category: n.category, postedById: admin.id } });
  }

  // ---- Fee structure + payments ----
  const feeItems: Array<{ title: string; amount: number; dueDays: number }> = [
    { title: 'Tuition Fee (Sem 3)', amount: 35000, dueDays: 30 },
    { title: 'Laboratory Fee', amount: 8000, dueDays: 20 },
    { title: 'Examination Fee', amount: 3000, dueDays: 10 },
    { title: 'Hostel & Mess Fee', amount: 40000, dueDays: 15 },
  ];
  const createdItems = [];
  for (const f of feeItems) {
    createdItems.push(
      await prisma.feeStructureItem.create({
        data: { title: f.title, course: COURSE, branch: BRANCH, semester: SEMESTER, amount: f.amount, dueDate: daysFromToday(f.dueDays) },
      }),
    );
  }
  // Tuition paid by students 0-5, pending for student 6, unpaid for student 7.
  for (let i = 0; i <= 5; i++) {
    await prisma.payment.create({
      data: {
        studentId: students[i]!.user.id,
        itemId: createdItems[0]!.id,
        amount: createdItems[0]!.amount,
        status: 'PAID',
        paidAt: daysFromToday(-(20 - i)),
      },
    });
  }
  await prisma.payment.create({
    data: { studentId: students[6]!.user.id, itemId: createdItems[0]!.id, amount: createdItems[0]!.amount, status: 'PENDING' },
  });
  // Exam fee paid by students 0-2.
  for (let i = 0; i <= 2; i++) {
    await prisma.payment.create({
      data: { studentId: students[i]!.user.id, itemId: createdItems[2]!.id, amount: createdItems[2]!.amount, status: 'PAID', paidAt: daysFromToday(-5) },
    });
  }

  // ---- Books + issues ----
  const bookSeed: Array<{ title: string; author: string; isbn: string; copies: number }> = [
    { title: 'Compilers: Principles and Practice', author: 'Alfred V. Aho', isbn: '978-0321711922', copies: 5 },
    { title: 'Database System Concepts', author: 'Abraham Silberschatz', isbn: '978-0073523323', copies: 4 },
    { title: 'Operating System Concepts', author: 'Abraham Silberschatz', isbn: '978-1119800361', copies: 3 },
    { title: 'Computer Networks', author: 'Andrew S. Tanenbaum', isbn: '978-0132126953', copies: 4 },
    { title: 'Discrete Mathematics', author: 'Kenneth H. Rosen', isbn: '978-0073383095', copies: 6 },
    { title: 'The Clean Coder', author: 'Robert C. Martin', isbn: '978-0137081073', copies: 2 },
  ];
  const createdBooks = [];
  for (const b of bookSeed) {
    createdBooks.push(
      await prisma.book.create({
        data: { title: b.title, author: b.author, isbn: b.isbn, totalCopies: b.copies, available: b.copies },
      }),
    );
  }
  await prisma.bookIssue.create({ data: { bookId: createdBooks[0]!.id, studentId: students[0]!.user.id, dueDate: daysFromToday(5) } });
  await prisma.bookIssue.create({ data: { bookId: createdBooks[1]!.id, studentId: students[1]!.user.id, dueDate: daysFromToday(-2) } }); // overdue
  await prisma.bookIssue.create({ data: { bookId: createdBooks[2]!.id, studentId: students[2]!.user.id, dueDate: daysFromToday(-9), returnedAt: daysFromToday(-4), fine: 20 } });

  // ---- Timetable ----
  const slotDefs: Array<{ subjectIdx: number; day: number; start: string; end: string; room: string }> = [
    { subjectIdx: 0, day: 0, start: '09:00', end: '10:00', room: 'Online Lab' },
    { subjectIdx: 1, day: 1, start: '09:00', end: '10:00', room: 'Online Lab' },
    { subjectIdx: 2, day: 2, start: '09:00', end: '10:00', room: 'Basement-2' },
    { subjectIdx: 3, day: 3, start: '09:00', end: '10:00', room: 'Basement-1' },
    { subjectIdx: 4, day: 4, start: '09:00', end: '10:00', room: 'Online Lab' },
    { subjectIdx: 5, day: 0, start: '11:00', end: '12:00', room: 'Basement-1' },
  ];
  for (const sd of slotDefs) {
    await prisma.timetableSlot.create({
      data: {
        subjectId: subjects[sd.subjectIdx]!.id,
        branch: BRANCH,
        semester: SEMESTER,
        dayOfWeek: sd.day,
        startTime: sd.start,
        endTime: sd.end,
        room: sd.room,
      },
    });
  }

  // ---- Syllabus ----
  const topicNames = ['Unit 1', 'Unit 2', 'Unit 3'];
  for (const sub of subjects) {
    for (const [ti, name] of topicNames.entries()) {
      await prisma.syllabusTopic.create({
        data: { subjectId: sub.id, title: `${sub.code} ${name}`, status: ti < 2 ? 'COVERED' : 'PENDING', coveredOn: ti < 2 ? daysFromToday(-(10 * (ti + 1))) : null },
      });
    }
  }

  // ---- Communication ----
  const ticket1 = await prisma.ticket.create({
    data: { studentId: students[0]!.user.id, subject: 'Can I get a bonafide certificate?', description: 'I need a bonafide certificate for a scholarship application.', status: 'OPEN' },
  });
  await prisma.ticketMessage.create({ data: { ticketId: ticket1.id, authorId: admin.id, body: 'Sure! Raise a request under Documents and an admin will approve it.' } });
  const ticket2 = await prisma.ticket.create({
    data: { studentId: students[1]!.user.id, subject: 'Grade clarification CS302', description: 'Requesting a re-check of my internal marks.', status: 'IN_PROGRESS', assignedToId: facultyUserIds[0] },
  });
  await prisma.ticketMessage.create({ data: { ticketId: ticket2.id, authorId: facultyUserIds[0]!, body: 'We will review your internal assessment. Expected resolution in 3 days.' } });

  console.log('Seeded ERP database.');
  console.log('  Admin:   admin@erp.test');
  for (let i = 0; i < 2; i++) console.log(`  Faculty: faculty${i + 1}@erp.test`);
  for (let i = 0; i < 8; i++) console.log(`  Student: student${i + 1}@erp.test`);
  console.log(`  Password for all: ${PASSWORD}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });