import fs from 'node:fs/promises';
import path from 'node:path';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HttpError } from '../middleware/errorHandler';
import { uploadDir } from '../middleware/upload';
import { buildGradeCard } from '../services/grades';
import { bonafidePdf, transcriptPdf } from '../utils/pdf';

export const requestSchema = z.object({
  type: z.enum(['BONAFIDE', 'TRANSCRIPT']),
  note: z.string().optional(),
});

const statuses = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export async function myRequests(req: Request, res: Response) {
  res.json(
    await prisma.documentRequest.findMany({
      where: { studentId: req.user!.id },
      orderBy: { requestedAt: 'desc' },
    }),
  );
}

export async function allRequests(req: Request, res: Response) {
  const status = typeof req.query.status === 'string' && (statuses as readonly string[]).includes(req.query.status)
    ? (req.query.status as (typeof statuses)[number])
    : undefined;
  res.json(
    await prisma.documentRequest.findMany({
      where: status ? { status } : undefined,
      include: { student: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { requestedAt: 'desc' },
      take: 200,
    }),
  );
}

export async function create(req: Request, res: Response) {
  const body = requestSchema.parse(req.body);
  const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
  if (!student) throw new HttpError(404, 'Student profile not found');
  const pending = await prisma.documentRequest.findFirst({
    where: { studentId: student.userId, status: 'PENDING' },
  });
  if (pending) throw new HttpError(400, 'You already have a pending request');
  const doc = await prisma.documentRequest.create({
    data: { studentId: student.userId, type: body.type, note: body.note },
  });
  res.status(201).json(doc);
}

export async function approve(req: Request, res: Response) {
  const doc = await prisma.documentRequest.findUnique({
    where: { id: req.params.id as string },
    include: { student: { include: { user: true } } },
  });
  if (!doc) throw new HttpError(404, 'Request not found');
  if (doc.status !== 'PENDING') throw new HttpError(400, 'Request already processed');

  const info = {
    student: doc.student.user.name,
    rollNo: doc.student.rollNo,
    branch: doc.student.branch,
    semester: doc.student.semester,
  };
  let buffer: Buffer;
  if (doc.type === 'BONAFIDE') {
    buffer = await bonafidePdf(info, { requestId: doc.id, issuedOn: new Date(), note: doc.note ?? undefined });
  } else {
    const gradeCard = await buildGradeCard(doc.student.userId);
    buffer = await transcriptPdf(info, gradeCard.trend, gradeCard.cgpa);
  }

  const filename = `${doc.type.toLowerCase()}-${doc.id}.pdf`;
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buffer);

  const updated = await prisma.documentRequest.update({
    where: { id: doc.id },
    data: { status: 'APPROVED', fileUrl: `/uploads/${filename}`, processedAt: new Date() },
  });
  res.json(updated);
}

export async function reject(req: Request, res: Response) {
  const doc = await prisma.documentRequest.findUnique({ where: { id: req.params.id as string } });
  if (!doc) throw new HttpError(404, 'Request not found');
  if (doc.status !== 'PENDING') throw new HttpError(400, 'Request already processed');
  res.json(
    await prisma.documentRequest.update({
      where: { id: doc.id },
      data: { status: 'REJECTED', processedAt: new Date() },
    }),
  );
}