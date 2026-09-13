import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HttpError } from '../middleware/errorHandler';
import { isoDate, parseDate } from '../services/validation';

export const subjectSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  branch: z.string().min(1),
  semester: z.coerce.number().int().positive(),
  credits: z.coerce.number().int().min(1).max(10),
  facultyId: z.string().min(1),
});

export const timetableSchema = z.object({
  subjectId: z.string().min(1),
  branch: z.string().min(1),
  semester: z.coerce.number().int().positive(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  room: z.string().optional(),
});

export const syllabusSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['COVERED', 'PENDING']).default('PENDING'),
});

export const syllabusUpdateSchema = z.object({
  status: z.enum(['COVERED', 'PENDING']),
  coveredOn: isoDate.optional(),
});

export async function listSubjects(req: Request, res: Response) {
  const user = req.user!;
  let where: Record<string, unknown> = {};
  if (user.role === 'STUDENT') {
    const student = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    if (!student) throw new HttpError(404, 'Student profile not found');
    where = { branch: student.branch, semester: student.semester };
  } else if (user.role === 'FACULTY') {
    where = { facultyId: user.id };
  }
  const subjects = await prisma.subject.findMany({
    where,
    include: { faculty: { select: { id: true, name: true } } },
    orderBy: { code: 'asc' },
  });
  res.json(subjects);
}

export async function createSubject(req: Request, res: Response) {
  const body = subjectSchema.parse(req.body);
  const faculty = await prisma.facultyProfile.findUnique({ where: { userId: body.facultyId } });
  if (!faculty) throw new HttpError(400, 'facultyId must reference an existing faculty user');
  const subject = await prisma.subject.create({ data: { ...body } });
  res.status(201).json(subject);
}

export async function subjectDetail(req: Request, res: Response) {
  const subject = await prisma.subject.findUnique({
    where: { id: req.params.id as string },
    include: {
      faculty: { select: { id: true, name: true } },
      timetable: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
      syllabus: { orderBy: { coveredOn: 'asc' } },
    },
  });
  if (!subject) throw new HttpError(404, 'Subject not found');
  res.json(subject);
}

export async function getTimetable(req: Request, res: Response) {
  const branch = typeof req.query.branch === 'string' ? req.query.branch : undefined;
  const semester = typeof req.query.semester === 'string' ? Number(req.query.semester) : undefined;
  const slots = await prisma.timetableSlot.findMany({
    where: {
      ...(branch ? { branch } : {}),
      ...(semester && !Number.isNaN(semester) ? { semester } : {}),
    },
    include: { subject: { select: { id: true, code: true, name: true } } },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
  res.json(slots);
}

export async function createTimetableSlot(req: Request, res: Response) {
  const body = timetableSchema.parse(req.body);
  const subject = await prisma.subject.findUnique({ where: { id: body.subjectId } });
  if (!subject) throw new HttpError(404, 'Subject not found');
  const slot = await prisma.timetableSlot.create({ data: { ...body } });
  res.status(201).json(slot);
}

export async function upsertSyllabus(req: Request, res: Response) {
  const body = syllabusSchema.parse(req.body);
  const subject = await prisma.subject.findUnique({ where: { id: body.subjectId } });
  if (!subject) throw new HttpError(404, 'Subject not found');
  if (req.user!.role === 'FACULTY' && subject.facultyId !== req.user!.id) {
    throw new HttpError(403, 'Not the teacher of this subject');
  }
  const topic = await prisma.syllabusTopic.create({
    data: {
      subjectId: body.subjectId,
      title: body.title,
      status: body.status,
      coveredOn: body.status === 'COVERED' ? new Date() : null,
    },
  });
  res.status(201).json(topic);
}

export async function updateSyllabusTopic(req: Request, res: Response) {
  const body = syllabusUpdateSchema.parse(req.body);
  const topic = await prisma.syllabusTopic.findUnique({ where: { id: req.params.id as string }, include: { subject: true } });
  if (!topic) throw new HttpError(404, 'Topic not found');
  if (req.user!.role === 'FACULTY' && topic.subject.facultyId !== req.user!.id) {
    throw new HttpError(403, 'Not the teacher of this subject');
  }
  const updated = await prisma.syllabusTopic.update({
    where: { id: topic.id },
    data: {
      status: body.status,
      coveredOn: body.status === 'COVERED' ? parseDate(body.coveredOn ?? new Date().toISOString().slice(0, 10)) : null,
    },
  });
  res.json(updated);
}