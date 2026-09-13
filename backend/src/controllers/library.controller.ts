import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HttpError } from '../middleware/errorHandler';

export const bookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().min(1),
  totalCopies: z.coerce.number().int().positive(),
});

export const issueSchema = z.object({ studentId: z.string().min(1) });

export const FINE_PER_DAY = 5;

export async function listBooks(req: Request, res: Response) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const books = await prisma.book.findMany({
    where: q
      ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { author: { contains: q, mode: 'insensitive' } }, { isbn: { contains: q, mode: 'insensitive' } }] }
      : undefined,
    orderBy: { title: 'asc' },
    take: 100,
  });
  res.json(books);
}

export async function createBook(req: Request, res: Response) {
  const body = bookSchema.parse(req.body);
  const book = await prisma.book.create({
    data: { title: body.title, author: body.author, isbn: body.isbn, totalCopies: body.totalCopies, available: body.totalCopies },
  });
  res.status(201).json(book);
}

export async function issueBook(req: Request, res: Response) {
  const body = issueSchema.parse(req.body);
  const book = await prisma.book.findUnique({ where: { id: req.params.id as string } });
  if (!book) throw new HttpError(404, 'Book not found');
  if (book.available <= 0) throw new HttpError(400, 'No copies available');
  const student = await prisma.studentProfile.findUnique({ where: { userId: body.studentId } });
  if (!student) throw new HttpError(404, 'Student not found');

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);
  await prisma.$transaction([
    prisma.book.update({ where: { id: book.id }, data: { available: { decrement: 1 } } }),
    prisma.bookIssue.create({
      data: { bookId: book.id, studentId: student.userId, dueDate },
    }),
  ]);
  res.status(201).json({ ok: true });
}

export async function returnBook(req: Request, res: Response) {
  const issue = await prisma.bookIssue.findUnique({ where: { id: req.params.id as string }, include: { book: true } });
  if (!issue) throw new HttpError(404, 'Issue not found');
  if (issue.returnedAt) throw new HttpError(400, 'Already returned');

  const end = new Date();
  const due = issue.dueDate;
  const overdueDays = Math.max(0, Math.floor((end.getTime() - due.getTime()) / (24 * 60 * 60 * 1000)));
  const fine = overdueDays * FINE_PER_DAY;

  const [issueUpdated, _book] = await prisma.$transaction([
    prisma.bookIssue.update({ where: { id: issue.id }, data: { returnedAt: end, fine: fine || null } }),
    prisma.book.update({ where: { id: issue.bookId }, data: { available: { increment: 1 } } }),
  ]);
  res.json({ ...issueUpdated, fine });
}

export async function myIssues(req: Request, res: Response) {
  res.json(
    await prisma.bookIssue.findMany({
      where: { studentId: req.user!.id },
      include: { book: { select: { id: true, title: true, author: true } } },
      orderBy: { issuedAt: 'desc' },
    }),
  );
}

export async function allIssues(_req: Request, res: Response) {
  res.json(
    await prisma.bookIssue.findMany({
      include: {
        book: { select: { id: true, title: true, author: true } },
        student: { select: { rollNo: true, user: { select: { name: true } } } },
      },
      orderBy: { issuedAt: 'desc' },
      take: 200,
    }),
  );
}