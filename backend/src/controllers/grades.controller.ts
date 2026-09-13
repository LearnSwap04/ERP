import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HttpError } from '../middleware/errorHandler';
import { buildGradeCard } from '../services/grades';
import { isoDate, parseDate } from '../services/validation';

export const examCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['INTERNAL', 'ENDSEM']),
  course: z.string().min(1),
  branch: z.string().min(1),
  semester: z.coerce.number().int().positive(),
  subjectId: z.string().min(1),
  date: isoDate,
  maxMarks: z.coerce.number().int().positive(),
});

export const marksEntrySchema = z.object({
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        obtained: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

export async function myGradeCard(req: Request, res: Response) {
  res.json(await buildGradeCard(req.user!.id));
}

export async function listExams(req: Request, res: Response) {
  const user = req.user!;
  if (user.role === 'STUDENT') {
    const student = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    if (!student) throw new HttpError(404, 'Student profile not found');
    const exams = await prisma.exam.findMany({
      where: { branch: student.branch, semester: student.semester },
      include: { subject: { select: { code: true, name: true } } },
      orderBy: { date: 'asc' },
    });
    res.json(exams);
    return;
  }
  if (user.role === 'FACULTY') {
    const subjects = await prisma.subject.findMany({ where: { facultyId: user.id } });
    const exams = await prisma.exam.findMany({
      where: { subjectId: { in: subjects.map((s) => s.id) } },
      include: { subject: { select: { code: true, name: true } } },
      orderBy: { date: 'asc' },
    });
    res.json(exams);
    return;
  }
  const exams = await prisma.exam.findMany({
    include: { subject: { select: { code: true, name: true } } },
    orderBy: { date: 'asc' },
  });
  res.json(exams);
}

export async function createExam(req: Request, res: Response) {
  const body = examCreateSchema.parse(req.body);
  const subject = await prisma.subject.findUnique({ where: { id: body.subjectId } });
  if (!subject) throw new HttpError(404, 'Subject not found');
  if (req.user!.role === 'FACULTY' && subject.facultyId !== req.user!.id) {
    throw new HttpError(403, 'Not the teacher of this subject');
  }
  const exam = await prisma.exam.create({
    data: {
      name: body.name,
      type: body.type,
      course: body.course,
      branch: body.branch,
      semester: body.semester,
      subjectId: body.subjectId,
      date: parseDate(body.date),
      maxMarks: body.maxMarks,
    },
  });
  res.status(201).json(exam);
}

/** Faculty: roster + existing marks for an exam (marks entry grid). */
export async function examRoster(req: Request, res: Response) {
  const exam = await prisma.exam.findUnique({ where: { id: req.params.id as string }, include: { subject: true } });
  if (!exam) throw new HttpError(404, 'Exam not found');
  if (req.user!.role === 'FACULTY' && exam.subject.facultyId !== req.user!.id) {
    throw new HttpError(403, 'Not the teacher of this subject');
  }
  const [students, marks] = await Promise.all([
    prisma.studentProfile.findMany({
      where: { branch: exam.branch, semester: exam.semester },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { rollNo: 'asc' },
    }),
    prisma.marks.findMany({ where: { examId: exam.id } }),
  ]);
  const byStudent = new Map(marks.map((m) => [m.studentId, m.obtained]));
  res.json({
    exam,
    students: students.map((s) => ({
      studentId: s.userId,
      rollNo: s.rollNo,
      name: s.user.name,
      obtained: byStudent.get(s.userId) ?? null,
    })),
  });
}

export async function enterMarks(req: Request, res: Response) {
  const body = marksEntrySchema.parse(req.body);
  const exam = await prisma.exam.findUnique({ where: { id: req.params.id as string }, include: { subject: true } });
  if (!exam) throw new HttpError(404, 'Exam not found');
  if (req.user!.role === 'FACULTY' && exam.subject.facultyId !== req.user!.id) {
    throw new HttpError(403, 'Not the teacher of this subject');
  }
  for (const entry of body.entries) {
    if (entry.obtained > exam.maxMarks) throw new HttpError(400, 'Marks cannot exceed maxMarks');
  }
  await prisma.$transaction(
    body.entries.map((e) =>
      prisma.marks.upsert({
        where: { studentId_examId: { studentId: e.studentId, examId: exam.id } },
        update: { obtained: e.obtained },
        create: { studentId: e.studentId, examId: exam.id, obtained: e.obtained },
      }),
    ),
  );
  res.json({ ok: true, count: body.entries.length });
}