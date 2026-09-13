import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { HttpError } from '../middleware/errorHandler';
import { attendancePercentage } from '../services/calculations';

function todayDayOfWeek(): number {
  const jsDay = new Date().getDay(); // 0=Sun .. 6=Sat
  return jsDay === 0 ? 6 : jsDay - 1; // 0=Mon .. 6=Sun
}

export async function summary(req: Request, res: Response) {
  const userId = req.user!.id;
  switch (req.user!.role) {
    case 'STUDENT':
      return res.json(await studentSummary(userId));
    case 'FACULTY':
      return res.json(await facultySummary(userId));
    case 'ADMIN':
      return res.json(await adminSummary());
  }
}

async function studentSummary(userId: string) {
  const student = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!student) throw new HttpError(404, 'Student profile not found');

  const subjects = await prisma.subject.findMany({
    where: { branch: student.branch, semester: student.semester },
    orderBy: { code: 'asc' },
  });
  const [records, latestResult, notices] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { studentId: student.userId, subjectId: { in: subjects.map((s) => s.id) } },
    }),
    prisma.semesterResult.findFirst({ where: { studentId: student.userId }, orderBy: { semester: 'desc' } }),
    prisma.notice.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  const perSubject = subjects.map((s) => ({
    subject: s,
    summary: attendancePercentage(records.filter((r) => r.subjectId === s.id)),
  }));

  const now = new Date();
  const nowDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const upcoming = await prisma.assignment.findMany({
    where: { subjectId: { in: subjects.map((s) => s.id) }, dueDate: { gte: nowDate } },
    orderBy: { dueDate: 'asc' },
    take: 5,
    include: { subject: { select: { code: true, name: true } }, submissions: { where: { studentId: student.userId } } },
  });

  return {
    role: 'STUDENT' as const,
    attendance: {
      overall: attendancePercentage(records),
      subjects: perSubject,
      threshold: env.ATTENDANCE_THRESHOLD,
    },
    upcomingAssignments: upcoming.map((a) => ({
      id: a.id,
      title: a.title,
      dueDate: a.dueDate,
      subjectCode: a.subject.code,
      submitted: a.submissions.length > 0,
    })),
    lastSemesterSgpa: latestResult?.sgpa ?? null,
    notices,
  };
}

async function facultySummary(userId: string) {
  const subjects = await prisma.subject.findMany({ where: { facultyId: userId }, orderBy: { code: 'asc' } });
  const subjectIds = subjects.map((s) => s.id);
  const [pendingSubmissions, notices, timetableCount] = await Promise.all([
    prisma.submission.count({ where: { grade: null, assignment: { subjectId: { in: subjectIds } } } }),
    prisma.notice.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.timetableSlot.count({
      where: { subjectId: { in: subjectIds }, dayOfWeek: todayDayOfWeek() },
    }),
  ]);
  return {
    role: 'FACULTY' as const,
    subjects: subjects.map((s) => ({ id: s.id, code: s.code, name: s.name, branch: s.branch, semester: s.semester })),
    pendingSubmissions,
    todayClasses: timetableCount,
    notices,
  };
}

async function adminSummary() {
  const [users, students, faculty, notices, openTickets, feesPaid] = await Promise.all([
    prisma.user.count(),
    prisma.studentProfile.count(),
    prisma.facultyProfile.count(),
    prisma.notice.count(),
    prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
  ]);
  const recentNotices = await prisma.notice.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
  return {
    role: 'ADMIN' as const,
    counts: { users, students, faculty, notices, openTickets },
    feesPaid: feesPaid._sum.amount ?? 0,
    recentNotices,
  };
}