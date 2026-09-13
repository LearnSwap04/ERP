import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { HttpError } from '../middleware/errorHandler';
import { attendancePercentage, classesCanMiss } from '../services/calculations';
import { isoDate, parseDate } from '../services/validation';
import type { AttendanceStatus } from '@prisma/client';

export const markSchema = z.object({
  subjectId: z.string().min(1),
  date: isoDate,
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(['PRESENT', 'ABSENT', 'LEAVE']),
      }),
    )
    .min(1),
});

export const rollQuerySchema = z.object({
  subjectId: z.string().min(1),
  date: isoDate,
});

export async function myAttendance(req: Request, res: Response) {
  const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
  if (!student) throw new HttpError(404, 'Student profile not found');
  const subjects = await prisma.subject.findMany({
    where: { branch: student.branch, semester: student.semester },
    include: { faculty: { select: { id: true, name: true } } },
    orderBy: { code: 'asc' },
  });
  const records = await prisma.attendanceRecord.findMany({
    where: { studentId: student.userId, subjectId: { in: subjects.map((s) => s.id) } },
    orderBy: { date: 'desc' },
  });
  const perSubject = subjects.map((s) => ({
    subject: s,
    summary: attendancePercentage(records.filter((r) => r.subjectId === s.id)),
  }));
  const bySubject = new Map(subjects.map((s) => [s.id, s]));
  const rows = records.slice(0, 50).map((r) => ({
    id: r.id,
    studentId: r.studentId,
    subjectId: r.subjectId,
    date: r.date,
    status: r.status,
    subject: bySubject.get(r.subjectId)
      ? { id: r.subjectId, code: bySubject.get(r.subjectId)!.code, name: bySubject.get(r.subjectId)!.name }
      : undefined,
  }));
  res.json({ overall: attendancePercentage(records), subjects: perSubject, records: rows });
}

export async function bunkCalculator(req: Request, res: Response) {
  const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
  if (!student) throw new HttpError(404, 'Student profile not found');
  const subjects = await prisma.subject.findMany({ where: { branch: student.branch, semester: student.semester } });
  const records = await prisma.attendanceRecord.findMany({
    where: { studentId: student.userId, subjectId: { in: subjects.map((s) => s.id) } },
  });
  const threshold = env.ATTENDANCE_THRESHOLD;
  const rows = subjects.map((s) => {
    const recs = records.filter((r) => r.subjectId === s.id);
    const summary = attendancePercentage(recs, threshold);
    return {
      subjectId: s.id,
      code: s.code,
      name: s.name,
      percentage: summary.percentage,
      total: summary.total,
      attended: summary.present,
      canMiss: classesCanMiss(summary.present, summary.total, threshold),
      meetsThreshold: summary.meetsThreshold,
    };
  });
  res.json({ threshold, rows });
}

/** Faculty: classes (subjects) they teach with name/branch/semester. */
export async function myClasses(req: Request, res: Response) {
  const subjects = await prisma.subject.findMany({ where: { facultyId: req.user!.id }, orderBy: { code: 'asc' } });
  res.json(subjects);
}

/** Faculty: roll-call list for a subject+date. Marks reflect existing records as PRESENT/ABSENT/LEAVE, else 'UNMARKED'. */
export async function rollCall(req: Request, res: Response) {
  const { subjectId, date } = rollQuerySchema.parse(req.query);
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) throw new HttpError(404, 'Subject not found');
  if (req.user!.role === 'FACULTY' && subject.facultyId !== req.user!.id) throw new HttpError(403, 'Not the teacher of this subject');

  const [students, records] = await Promise.all([
    prisma.studentProfile.findMany({
      where: { branch: subject.branch, semester: subject.semester },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { rollNo: 'asc' },
    }),
    prisma.attendanceRecord.findMany({ where: { subjectId, date: parseDate(date) } }),
  ]);
  const byStudent = new Map(records.map((r) => [r.studentId, r.status]));
  res.json({
    subject,
    date,
    students: students.map((s) => ({
      studentId: s.userId,
      rollNo: s.rollNo,
      name: s.user.name,
      email: s.user.email,
      status: (byStudent.get(s.userId) as AttendanceStatus | undefined) ?? 'UNMARKED',
    })),
  });
}

/** Faculty: batch upsert attendance for a subject+date. */
export async function mark(req: Request, res: Response) {
  const body = markSchema.parse(req.body);
  const subject = await prisma.subject.findUnique({ where: { id: body.subjectId } });
  if (!subject) throw new HttpError(404, 'Subject not found');
  if (req.user!.role === 'FACULTY' && subject.facultyId !== req.user!.id) throw new HttpError(403, 'Not the teacher of this subject');

  const date = parseDate(body.date);
  await prisma.$transaction(
    body.records.map((r) =>
      prisma.attendanceRecord.upsert({
        where: { studentId_subjectId_date: { studentId: r.studentId, subjectId: body.subjectId, date } },
        update: { status: r.status, markedById: req.user!.id },
        create: { studentId: r.studentId, subjectId: body.subjectId, date, status: r.status, markedById: req.user!.id },
      }),
    ),
  );
  res.json({ ok: true, count: body.records.length });
}