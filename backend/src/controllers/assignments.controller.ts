import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HttpError } from '../middleware/errorHandler';
import { uploadUrl } from '../middleware/upload';
import { isoDate, parseDate } from '../services/validation';

export const assignmentCreateSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: isoDate,
});

export const submissionGradeSchema = z.object({
  grade: z.coerce.number().int().min(0).max(100),
  feedback: z.string().optional(),
});

const includeFor = {
  subject: { select: { id: true, code: true, name: true, branch: true, semester: true } },
  faculty: { select: { id: true, name: true } },
  submissions: {
    include: { student: { select: { userId: true, rollNo: true, user: { select: { name: true } } } } },
  },
} as const;

export async function list(req: Request, res: Response) {
  const user = req.user!;
  if (user.role === 'STUDENT') {
    const student = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    if (!student) throw new HttpError(404, 'Student profile not found');
    const assignments = await prisma.assignment.findMany({
      where: { subject: { branch: student.branch, semester: student.semester } },
      include: includeFor,
      orderBy: { dueDate: 'asc' },
    });
    res.json(assignments);
    return;
  }
  if (user.role === 'FACULTY') {
    const assignments = await prisma.assignment.findMany({
      where: { facultyId: user.id },
      include: includeFor,
      orderBy: { createdAt: 'desc' },
    });
    res.json(assignments);
    return;
  }
  const assignments = await prisma.assignment.findMany({ include: includeFor, orderBy: { createdAt: 'desc' } });
  res.json(assignments);
}

export async function getById(req: Request, res: Response) {
  const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id as string }, include: includeFor });
  if (!assignment) throw new HttpError(404, 'Assignment not found');
  res.json(assignment);
}

export async function create(req: Request, res: Response) {
  const body = assignmentCreateSchema.parse(req.body);
  const subject = await prisma.subject.findUnique({ where: { id: body.subjectId } });
  if (!subject) throw new HttpError(404, 'Subject not found');
  if (req.user!.role === 'FACULTY' && subject.facultyId !== req.user!.id) {
    throw new HttpError(403, 'Not the teacher of this subject');
  }
  const file = req.file;
  const assignment = await prisma.assignment.create({
    data: {
      subjectId: body.subjectId,
      facultyId: req.user!.id,
      title: body.title,
      description: body.description,
      dueDate: parseDate(body.dueDate),
      fileUrl: file ? uploadUrl(file.filename) : undefined,
    },
  });
  res.status(201).json(assignment);
}

/** Student submits their file for an assignment (one submission per student/assignment). */
export async function submit(req: Request, res: Response) {
  const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id as string } });
  if (!assignment) throw new HttpError(404, 'Assignment not found');
  const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
  if (!student) throw new HttpError(404, 'Student profile not found');

  const existing = await prisma.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.userId } },
  });
  if (existing) throw new HttpError(400, 'Already submitted; use resubmission only via admin (MVP: delete+re-submit).');
  if (!req.file) throw new HttpError(400, 'A file is required for submission');

  const submission = await prisma.submission.create({
    data: {
      assignmentId: assignment.id,
      studentId: student.userId,
      fileUrl: uploadUrl(req.file.filename),
    },
  });
  res.status(201).json(submission);
}

export async function gradeSubmission(req: Request, res: Response) {
  const body = submissionGradeSchema.parse(req.body);
  const submission = await prisma.submission.findUnique({
    where: { id: req.params.id as string },
    include: { assignment: true },
  });
  if (!submission) throw new HttpError(404, 'Submission not found');
  if (req.user!.role === 'FACULTY' && submission.assignment.facultyId !== req.user!.id) {
    throw new HttpError(403, 'Not your assignment to grade');
  }
  const updated = await prisma.submission.update({
    where: { id: submission.id },
    data: { grade: body.grade, feedback: body.feedback },
  });
  res.json(updated);
}