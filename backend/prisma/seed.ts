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

  // ─────────────────────────────────────────────────────────────────────────────
  // DEMO-DATA ENRICHMENT: give every section enough realistic content to demo.
  // ─────────────────────────────────────────────────────────────────────────────

  // Deterministic pseudo-random so re-runs are stable.
  const rnd = (n: number) => Math.floor(((n * 2654435761) % 2147483648) / 2147483648 * 1e6) % n;

  // ---- Notices: a fuller feed spread over the last ~5 weeks ----
  const extraNotices: Array<{ title: string; body: string; category: 'EXAM' | 'EVENT' | 'HOLIDAY' | 'GENERAL'; daysAgo: number }> = [
    { title: 'End-Semester Timetable Posted', body: 'Official end-semester exam timetable for all branches is now available under Academics.', category: 'EXAM', daysAgo: 2 },
    { title: 'Guest Lecture: Systems Design', body: 'A guest lecture on large-scale system design by an industry alum this Thursday at the main auditorium.', category: 'EVENT', daysAgo: 5 },
    { title: 'Coding Club: Competitive Programming', body: 'Weekly CP practice rounds restart from Monday. No prior experience required.', category: 'EVENT', daysAgo: 7 },
    { title: 'Mid-Term Internal Grades Released', body: 'Internal-1 grades for Semester 3 are visible on the Grades page.', category: 'EXAM', daysAgo: 10 },
    { title: 'Library Timings Update', body: 'The central library now stays open until 10 PM on weekdays during the semester.', category: 'GENERAL', daysAgo: 12 },
    { title: 'Placement Orientation ', body: 'Final-year students invited to the pre-placement talk — registrations open on the portal.', category: 'EVENT', daysAgo: 16 },
    { title: 'Department Seminar on AI', body: 'CS department seminar on applied machine learning in databases. Attendance encouraged.', category: 'EVENT', daysAgo: 20 },
    { title: 'Holiday Declaration', body: 'Institute holiday on the occasion of the state foundation day next week.', category: 'HOLIDAY', daysAgo: 24 },
    { title: 'Fee Concession Window', body: 'Eligible students may apply for fee concession before the end of this month.', category: 'GENERAL', daysAgo: 28 },
    { title: 'Hostel Wi-Fi Upgrade', body: 'Planned network maintenance this weekend. Expect brief downtime in hostels.', category: 'GENERAL', daysAgo: 32 },
  ];
  for (const [ni, n] of extraNotices.entries()) {
    await prisma.notice.create({
      data: {
        title: n.title,
        body: n.body,
        category: n.category,
        postedById: ni % 2 === 0 ? admin.id : facultyUserIds[ni % facultyUserIds.length]!,
        createdAt: daysFromToday(-n.daysAgo),
      },
    });
  }

  // ---- Internal-2 exams + marks (richer grade card & exam list) ----
  for (const sub of subjects) {
    const exam = await prisma.exam.create({
      data: {
        name: `${sub.code} Internal-2`,
        type: 'INTERNAL',
        course: COURSE,
        branch: BRANCH,
        semester: SEMESTER,
        subjectId: sub.id,
        date: daysFromToday(-22),
        maxMarks: 25,
      },
    });
    for (const s of students) {
      const obtained = 14 + rnd(s.index * 31 + sub.index * 7 + 5); // 14..38 → clamp to max
      await prisma.marks.create({
        data: { studentId: s.user.id, examId: exam.id, obtained: Math.min(obtained, 25) },
      });
    }
  }

  // ---- Extra assignments (mix of upcoming + one recently closed) ----
  const moreAssignments: Array<{ subjectIdx: number; title: string; description: string; dueDays: number }> = [
    { subjectIdx: 1, title: 'Graph Algorithms Problem Set', description: 'Solve shortest-path and MST problems with complexity notes.', dueDays: 4 },
    { subjectIdx: 4, title: 'Requirements Document Draft', description: 'Draft an SRS for a hostel management system.', dueDays: 9 },
    { subjectIdx: 2, title: 'Deadlock Simulation Lab', description: 'Simulate Banker’s algorithm and report deadlock outcomes.', dueDays: 13 },
    { subjectIdx: 3, title: 'Network Simulation Report', description: 'Model a small LAN in a simulator and document throughput.', dueDays: 16 },
    { subjectIdx: 5, title: 'Combinatorics Worksheet', description: 'Worked solutions for permutations, combinations and recurrences.', dueDays: 3 },
    { subjectIdx: 0, title: 'SQL Query Optimization', description: 'Analyze query plans and rewrite slow queries for the sample dataset.', dueDays: 21 },
    { subjectIdx: 1, title: 'Huffman Coding Extra Credit', description: 'Implement Huffman encoding and compare compression ratios.', dueDays: -6 },
  ];
  const extraAssignmentIds: string[] = [];
  for (const def of moreAssignments) {
    const subject = subjects[def.subjectIdx]!;
    const a = await prisma.assignment.create({
      data: {
        subjectId: subject.id,
        facultyId: subject.facultyId,
        title: def.title,
        description: def.description,
        dueDate: daysFromToday(def.dueDays),
      },
    });
    extraAssignmentIds.push(a.id);
  }

  // ---- Submissions: every assignment gets a realistic mix ----
  for (const [ai, aid] of [...assignmentIds, ...extraAssignmentIds].entries()) {
    const submitterCount = 4 + (ai % 3); // 4..6 students per assignment
    const graded = ['Great work!', 'Good attempt, minor gaps in Q3.', 'Solid analysis.', 'Header formatting fix needed.', 'Nice edge-case coverage.'];
    for (let i = 0; i < submitterCount; i++) {
      const studentIdx = (ai * 3 + i) % students.length;
      const existing = await prisma.submission.findUnique({
        where: { assignmentId_studentId: { assignmentId: aid, studentId: students[studentIdx]!.user.id } },
      });
      if (existing) continue;
      const isGraded = i % 2 === 0; // roughly half graded
      const posted = new Date(rnd(9) + 1);
      await prisma.submission.create({
        data: {
          assignmentId: aid,
          studentId: students[studentIdx]!.user.id,
          fileUrl: `/uploads/assignment-${ai}-student-${studentIdx}.pdf`,
          submittedAt: daysFromToday(-posted),
          grade: isGraded ? 55 + (rnd(studentIdx * 13 + ai * 5 + 30) % 30) : null, // 55..84
          feedback: isGraded ? graded[rnd(studentIdx + ai) % graded.length] : null,
        },
      });
    }
  }

  // ---- Documents: give students & admin a populated queue ----
  const docSeed: Array<{ studentIdx: number; type: 'BONAFIDE' | 'TRANSCRIPT'; status: 'PENDING' | 'APPROVED' | 'REJECTED'; note?: string; daysAgo: number }> = [
    { studentIdx: 0, type: 'BONAFIDE', status: 'APPROVED', note: 'Scholarship application proof.', daysAgo: 12 },
    { studentIdx: 0, type: 'TRANSCRIPT', status: 'PENDING', note: 'For higher studies application.', daysAgo: 2 },
    { studentIdx: 1, type: 'BONAFIDE', status: 'APPROVED', note: 'Bank loan verification.', daysAgo: 20 },
    { studentIdx: 1, type: 'TRANSCRIPT', status: 'APPROVED', note: 'Exchange program application.', daysAgo: 8 },
    { studentIdx: 2, type: 'TRANSCRIPT', status: 'REJECTED', note: 'Incomplete marksheet — resubmit.', daysAgo: 15 },
    { studentIdx: 3, type: 'BONAFIDE', status: 'PENDING', note: 'Government ID address proof.', daysAgo: 3 },
    { studentIdx: 4, type: 'TRANSCRIPT', status: 'APPROVED', note: 'GATE application document.', daysAgo: 30 },
    { studentIdx: 5, type: 'BONAFIDE', status: 'PENDING', note: 'Hostel concession form.', daysAgo: 1 },
    { studentIdx: 6, type: 'TRANSCRIPT', status: 'PENDING', note: 'Job application transcript.', daysAgo: 4 },
    { studentIdx: 7, type: 'BONAFIDE', status: 'APPROVED', note: 'Voter ID address proof.', daysAgo: 25 },
  ];
  for (const d of docSeed) {
    await prisma.documentRequest.create({
      data: {
        studentId: students[d.studentIdx]!.user.id,
        type: d.type,
        status: d.status,
        note: d.note,
        requestedAt: daysFromToday(-d.daysAgo),
        processedAt: d.status === 'PENDING' ? null : daysFromToday(-(d.daysAgo - 2)),
        fileUrl: d.status === 'APPROVED' ? `/uploads/documents/${d.type.toLowerCase()}-${d.studentIdx}.pdf` : null,
      },
    });
  }

  // ---- Communication: tickets for every student with message threads ----
  const ticketSeed: Array<{ studentIdx: number; subject: string; description: string; status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'; daysAgo: number }> = [
    { studentIdx: 0, subject: 'Bonafide certificate status', description: 'Requested last week, do I need to upload anything else?', status: 'RESOLVED', daysAgo: 9 },
    { studentIdx: 2, subject: 'Hall ticket not visible', description: 'End-sem hall ticket is not appearing on my profile.', status: 'IN_PROGRESS', daysAgo: 2 },
    { studentIdx: 3, subject: 'Wi-Fi credentials reset', description: 'Unable to connect to campus Wi-Fi after hostel change.', status: 'OPEN', daysAgo: 1 },
    { studentIdx: 4, subject: 'Attendance correction request', description: 'I missed one class because of the medical leave; can it be adjusted?', status: 'OPEN', daysAgo: 4 },
    { studentIdx: 5, subject: 'Library fine dispute', description: 'I returned the book on time but a fine was added.', status: 'IN_PROGRESS', daysAgo: 7 },
    { studentIdx: 6, subject: 'Fee receipt copy', description: 'Need a copy of the tuition fee receipt for reimbursement.', status: 'RESOLVED', daysAgo: 13 },
    { studentIdx: 7, subject: 'Roll number change request', description: 'Typo in the printed roll number on my ID card.', status: 'OPEN', daysAgo: 2 },
  ];
  const staffReplies = [
    'That has been completed — please check the Documents page.',
    'We are on it; you will get an update by the end of the day.',
    'Logged. Our team will reach out shortly.',
    'Kindly attach a copy of the medical certificate to the ticket.',
    'Checked and resolved — the fine has been waived.',
    'Your receipt is available under Fee Receipts now.',
    'Raised to the exam cell for correction.',
  ];
  for (const [ti, t] of ticketSeed.entries()) {
    const resolver = t.status === 'RESOLVED' ? admin.id : facultyUserIds[ti % facultyUserIds.length]!;
    const ticket = await prisma.ticket.create({
      data: {
        studentId: students[t.studentIdx]!.user.id,
        subject: t.subject,
        description: t.description,
        status: t.status,
        assignedToId: t.status === 'OPEN' ? null : resolver,
        createdAt: daysFromToday(-t.daysAgo),
        updatedAt: daysFromToday(-Math.max(0, t.daysAgo - 1)),
      },
    });
    await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, authorId: students[t.studentIdx]!.user.id, body: t.description, createdAt: daysFromToday(-t.daysAgo) },
    });
    if (t.status !== 'OPEN') {
      await prisma.ticketMessage.create({
        data: { ticketId: ticket.id, authorId: resolver, body: staffReplies[ti % staffReplies.length]!, createdAt: daysFromToday(-Math.max(0, t.daysAgo - 1)) },
      });
    }
    if (t.status === 'RESOLVED') {
      await prisma.ticketMessage.create({
        data: { ticketId: ticket.id, authorId: students[t.studentIdx]!.user.id, body: 'Thank you, issue resolved.', createdAt: daysFromToday(-Math.max(0, t.daysAgo - 2)) },
      });
    }
  }

  // ---- Timetable: a fuller teaching week (Mon–Sat) ----
  const weekSlots: Array<{ subjectIdx: number; day: number; start: string; end: string; room: string }> = [
    { subjectIdx: 4, day: 0, start: '10:00', end: '11:00', room: 'Basement-2' },
    { subjectIdx: 2, day: 0, start: '14:00', end: '15:00', room: 'Online Lab' },
    { subjectIdx: 0, day: 1, start: '11:00', end: '12:00', room: 'Basement-1' },
    { subjectIdx: 3, day: 1, start: '14:00', end: '15:00', room: 'Basement-2' },
    { subjectIdx: 5, day: 1, start: '09:00', end: '10:00', room: 'Online Lab' },
    { subjectIdx: 0, day: 2, start: '11:00', end: '12:00', room: 'Basement-2' },
    { subjectIdx: 1, day: 2, start: '14:00', end: '15:00', room: 'Online Lab' },
    { subjectIdx: 3, day: 2, start: '10:00', end: '11:00', room: 'Basement-1' },
    { subjectIdx: 1, day: 3, start: '10:00', end: '11:00', room: 'Basement-2' },
    { subjectIdx: 4, day: 3, start: '11:00', end: '12:00', room: 'Online Lab' },
    { subjectIdx: 5, day: 3, start: '14:00', end: '15:00', room: 'Basement-1' },
    { subjectIdx: 1, day: 4, start: '11:00', end: '12:00', room: 'Basement-2' },
    { subjectIdx: 2, day: 4, start: '14:00', end: '15:00', room: 'Online Lab' },
    { subjectIdx: 3, day: 4, start: '10:00', end: '11:00', room: 'Basement-1' },
    { subjectIdx: 0, day: 5, start: '09:00', end: '10:00', room: 'Basement-1' },
    { subjectIdx: 5, day: 5, start: '11:00', end: '12:00', room: 'Online Lab' },
  ];
  for (const w of weekSlots) {
    const existing = await prisma.timetableSlot.findFirst({
      where: { subjectId: subjects[w.subjectIdx]!.id, dayOfWeek: w.day, startTime: w.start, endTime: w.end },
    });
    if (existing) continue;
    await prisma.timetableSlot.create({
      data: {
        subjectId: subjects[w.subjectIdx]!.id,
        branch: BRANCH,
        semester: SEMESTER,
        dayOfWeek: w.day,
        startTime: w.start,
        endTime: w.end,
        room: w.room,
      },
    });
  }

  // ---- Syllabus: extend to a fuller unit list ----
  const moreUnits: Array<{ title: string; status: 'COVERED' | 'PENDING'; coveredDaysAgo?: number }> = [
    { title: 'Unit 4', status: 'COVERED', coveredDaysAgo: 5 },
    { title: 'Unit 5', status: 'PENDING' },
  ];
  for (const sub of subjects) {
    for (const [ui, unit] of moreUnits.entries()) {
      await prisma.syllabusTopic.create({
        data: {
          subjectId: sub.id,
          title: `${sub.code} ${unit.title}`,
          status: unit.status,
          coveredOn: unit.status === 'COVERED' ? daysFromToday(-unit.coveredDaysAgo!) : null,
        },
      });
    }
  }

  // ---- Library: a few more titles + issues with consistent availability ----
  const extraBooks: Array<{ title: string; author: string; isbn: string; copies: number }> = [
    { title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', isbn: '978-1449373320', copies: 3 },
    { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', isbn: '978-0262033848', copies: 4 },
    { title: 'Clean Architecture', author: 'Robert C. Martin', isbn: '978-0134494166', copies: 2 },
    { title: 'Computer Organization and Design', author: 'David A. Patterson', isbn: '978-0124077263', copies: 3 },
    { title: 'The Pragmatic Programmer', author: 'Andrew Hunt', isbn: '978-0201616224', copies: 2 },
  ];
  const allBooks = [...createdBooks];
  for (const b of extraBooks) {
    allBooks.push(
      await prisma.book.create({
        data: { title: b.title, author: b.author, isbn: b.isbn, totalCopies: b.copies, available: b.copies },
      }),
    );
  }
  const issueSeed: Array<{ bookIdx: number; studentIdx: number; dueDays: number; returnedDaysAgo?: number; fine?: number }> = [
    { bookIdx: 3, studentIdx: 0, dueDays: 12 },
    { bookIdx: 4, studentIdx: 1, dueDays: 18 },
    { bookIdx: 6, studentIdx: 2, dueDays: 9 },
    { bookIdx: 7, studentIdx: 3, dueDays: 15 },
    { bookIdx: 8, studentIdx: 4, dueDays: 7 },
    { bookIdx: 9, studentIdx: 5, dueDays: -1, fine: 10 },
    { bookIdx: 10, studentIdx: 6, dueDays: 21 },
    { bookIdx: 6, studentIdx: 7, dueDays: 5 },
    { bookIdx: 9, studentIdx: 0, dueDays: 20, returnedDaysAgo: 3, fine: 0 },
    { bookIdx: 7, studentIdx: 2, dueDays: 11, returnedDaysAgo: 6, fine: 20 },
  ];
  const activeIssues = new Map<number, number>(); // bookIdx -> active count (excludes returned)
  for (const is of issueSeed) {
    await prisma.bookIssue.create({
      data: {
        bookId: allBooks[is.bookIdx]!.id,
        studentId: students[is.studentIdx]!.user.id,
        issuedAt: daysFromToday(-(is.dueDays + 7)),
        dueDate: daysFromToday(is.dueDays),
        returnedAt: is.returnedDaysAgo !== undefined ? daysFromToday(-is.returnedDaysAgo) : null,
        fine: is.fine ?? null,
      },
    });
    if (is.returnedDaysAgo !== undefined) continue;
    activeIssues.set(is.bookIdx, (activeIssues.get(is.bookIdx) ?? 0) + 1);
  }
  // Reconcile availability so the library table matches active issues.
  for (const [bi, book] of allBooks.entries()) {
    const active = activeIssues.get(bi) ?? 0;
    if (book.available !== book.totalCopies - active) {
      await prisma.book.update({
        where: { id: book.id },
        data: { available: book.totalCopies - active },
      });
    }
  }
  void weekSlots;

  // ---- Fees: one more structure item + a fuller per-student ledger ----
  const sportsFee = await prisma.feeStructureItem.create({
    data: { title: 'Sports & Cultural Fee', course: COURSE, branch: BRANCH, semester: SEMESTER, amount: 5000, dueDate: daysFromToday(5) },
  });
  const allItems = [...createdItems, sportsFee];
  const paymentSeed: Array<{ itemIdx: number; studentIdx: number; status: 'PAID' | 'PENDING'; daysAgo?: number }> = [];
  // Lab fee: paid by students 0-3, pending 4-5.
  for (let i = 0; i <= 5; i++) paymentSeed.push({ itemIdx: 1, studentIdx: i, status: i <= 3 ? 'PAID' : 'PENDING', daysAgo: i <= 3 ? 18 - i : undefined });
  // Hostel fee: paid by students 0-2, pending 3-4.
  for (let i = 0; i <= 4; i++) paymentSeed.push({ itemIdx: 3, studentIdx: i, status: i <= 2 ? 'PAID' : 'PENDING', daysAgo: i <= 2 ? 15 - i : undefined });
  // Exam fee: paid 0-5 (student 5 newly), pending 6, unpaid 7.
  for (let i = 0; i <= 6; i++) {
    if (i === 7) continue;
    const exists = i <= 2; // students 0-2 already paid exam fee above
    if (!exists) paymentSeed.push({ itemIdx: 2, studentIdx: i, status: i === 6 ? 'PENDING' : 'PAID', daysAgo: i === 6 ? undefined : 5 });
  }
  // Sports fee: pending for student 1 (so the demo shows a payable row), paid for 2-3.
  for (let i = 1; i <= 3; i++) paymentSeed.push({ itemIdx: 4, studentIdx: i, status: i === 1 ? 'PENDING' : 'PAID', daysAgo: i === 1 ? undefined : 2 });
  // Tuition for student 7 (currently unpaid).
  await prisma.payment.create({ data: { studentId: students[7]!.user.id, itemId: allItems[0]!.id, amount: allItems[0]!.amount, status: 'PENDING' } });
  for (const p of paymentSeed) {
    const exists = await prisma.payment.findUnique({
      where: { studentId_itemId: { studentId: students[p.studentIdx]!.user.id, itemId: allItems[p.itemIdx]!.id } },
    });
    if (exists) continue;
    await prisma.payment.create({
      data: {
        studentId: students[p.studentIdx]!.user.id,
        itemId: allItems[p.itemIdx]!.id,
        amount: allItems[p.itemIdx]!.amount,
        status: p.status,
        paidAt: p.status === 'PAID' ? daysFromToday(-(p.daysAgo ?? 5)) : null,
      },
    });
  }

  // ---- Attendance: a few recent classes so the last week looks live ----
  const recentDates = [
    { dayOffset: -1, presentPattern: 6 },
    { dayOffset: -3, presentPattern: 5 },
    { dayOffset: -5, presentPattern: 4 },
  ];
  for (const s of students) {
    for (const sub of subjects) {
      for (const rd of recentDates) {
        const already = await prisma.attendanceRecord.findUnique({
          where: { studentId_subjectId_date: { studentId: s.user.id, subjectId: sub.id, date: daysFromToday(rd.dayOffset) } },
        });
        if (already) continue;
        const absentForSubject = (s.index + sub.index) % 3 === 0;
        const status = absentForSubject ? 'ABSENT' : 'PRESENT';
        await prisma.attendanceRecord.create({
          data: {
            studentId: s.user.id,
            subjectId: sub.id,
            date: daysFromToday(rd.dayOffset),
            status: status as 'PRESENT' | 'ABSENT' | 'LEAVE',
            markedById: sub.facultyId,
          },
        });
      }
    }
  }

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