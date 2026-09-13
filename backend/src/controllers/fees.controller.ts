import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HttpError } from '../middleware/errorHandler';
import { feeReceiptPdf } from '../utils/pdf';
import { isoDate, parseDate } from '../services/validation';

export const structureCreateSchema = z.object({
  title: z.string().min(1),
  course: z.string().min(1),
  branch: z.string().min(1),
  semester: z.coerce.number().int().positive(),
  amount: z.coerce.number().int().positive(),
  dueDate: isoDate,
});

export async function listStructure(_req: Request, res: Response) {
  const items = await prisma.feeStructureItem.findMany({ orderBy: [{ semester: 'asc' }, { dueDate: 'asc' }] });
  res.json(items);
}

export async function createStructure(req: Request, res: Response) {
  const body = structureCreateSchema.parse(req.body);
  const item = await prisma.feeStructureItem.create({
    data: {
      title: body.title,
      course: body.course,
      branch: body.branch,
      semester: body.semester,
      amount: body.amount,
      dueDate: parseDate(body.dueDate),
    },
  });
  res.status(201).json(item);
}

/** Student fee ledger: structure items for their course/branch/sem with per-item payment status. */
export async function myFees(req: Request, res: Response) {
  const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
  if (!student) throw new HttpError(404, 'Student profile not found');
  const [items, payments] = await Promise.all([
    prisma.feeStructureItem.findMany({
      where: { course: student.course, branch: student.branch, semester: student.semester },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.payment.findMany({ where: { studentId: student.userId } }),
  ]);
  const byItem = new Map(payments.map((p) => [p.itemId, p]));
  res.json(
    items.map((item) => {
      const payment = byItem.get(item.id);
      return {
        item,
        payment: payment ?? null,
        status: payment?.status ?? 'UNPAID',
      };
    }),
  );
}

/** Student marks an item as paid (demo: no real gateway). Idempotent per item. */
export async function pay(req: Request, res: Response) {
  const body = z.object({ itemId: z.string().min(1) }).parse(req.body);
  const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
  if (!student) throw new HttpError(404, 'Student profile not found');
  const item = await prisma.feeStructureItem.findUnique({ where: { id: body.itemId } });
  if (!item) throw new HttpError(404, 'Fee item not found');

  const existing = await prisma.payment.findUnique({
    where: { studentId_itemId: { studentId: student.userId, itemId: item.id } },
  });
  if (existing) {
    res.json(existing);
    return;
  }
  const payment = await prisma.payment.create({
    data: {
      studentId: student.userId,
      itemId: item.id,
      amount: item.amount,
      status: 'PAID',
      paidAt: new Date(),
      receiptUrl: '',
    },
  });
  const withUrl = await prisma.payment.update({
    where: { id: payment.id },
    data: { receiptUrl: `/api/fees/payments/${payment.id}/receipt` },
  });
  res.status(201).json(withUrl);
}

export async function listPayments(_req: Request, res: Response) {
  const payments = await prisma.payment.findMany({
    include: { student: { include: { user: { select: { name: true, email: true } } } }, item: true },
    orderBy: { paidAt: 'desc' },
  });
  res.json(payments);
}

/** Download a receipt PDF for a paid payment (owner or admin). */
export async function receipt(req: Request, res: Response) {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id as string },
    include: { student: { include: { user: true } }, item: true },
  });
  if (!payment || payment.status !== 'PAID') throw new HttpError(404, 'Paid payment not found');
  if (req.user!.role === 'STUDENT' && payment.studentId !== req.user!.id) {
    throw new HttpError(403, 'Not your receipt');
  }
  const buffer = await feeReceiptPdf(
    {
      student: payment.student.user.name,
      rollNo: payment.student.rollNo,
      branch: payment.student.branch,
      semester: payment.student.semester,
    },
    {
      title: payment.item.title,
      amount: payment.amount,
      paidAt: payment.paidAt ?? new Date(),
      receiptNo: payment.id,
    },
  );
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="receipt-${payment.id}.pdf"`);
  res.send(buffer);
}