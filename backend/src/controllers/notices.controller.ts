import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HttpError } from '../middleware/errorHandler';

export const noticeSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  category: z.enum(['EXAM', 'EVENT', 'HOLIDAY', 'GENERAL']).default('GENERAL'),
});

const CATEGORIES = ['EXAM', 'EVENT', 'HOLIDAY', 'GENERAL'] as const;

export async function list(req: Request, res: Response) {
  const category = typeof req.query.category === 'string' && (CATEGORIES as readonly string[]).includes(req.query.category)
    ? (req.query.category as (typeof CATEGORIES)[number])
    : undefined;
  const notices = await prisma.notice.findMany({
    where: category ? { category } : undefined,
    include: { postedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(notices);
}

export async function create(req: Request, res: Response) {
  const body = noticeSchema.parse(req.body);
  const notice = await prisma.notice.create({
    data: { title: body.title, body: body.body, category: body.category, postedById: req.user!.id },
  });
  res.status(201).json(notice);
}

export async function update(req: Request, res: Response) {
  const body = noticeSchema.partial().parse(req.body);
  const existing = await prisma.notice.findUnique({ where: { id: req.params.id as string } });
  if (!existing) throw new HttpError(404, 'Notice not found');
  const notice = await prisma.notice.update({
    where: { id: existing.id },
    data: { ...(body.title !== undefined ? { title: body.title } : {}), ...(body.body !== undefined ? { body: body.body } : {}), ...(body.category !== undefined ? { category: body.category } : {}) },
  });
  res.json(notice);
}

export async function remove(req: Request, res: Response) {
  const existing = await prisma.notice.findUnique({ where: { id: req.params.id as string } });
  if (!existing) throw new HttpError(404, 'Notice not found');
  await prisma.notice.delete({ where: { id: existing.id } });
  res.json({ ok: true });
}