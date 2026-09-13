import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HttpError } from '../middleware/errorHandler';

export const ticketCreateSchema = z.object({
  subject: z.string().min(1),
  description: z.string().min(1),
});

export const ticketStatusSchema = z.object({ status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']) });

export const messageSchema = z.object({ body: z.string().min(1) });

const includeTicket = {
  student: { select: { rollNo: true, user: { select: { id: true, name: true } } } },
  assignedTo: { select: { id: true, name: true } },
  messages: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'asc' } },
} as const;

export async function list(req: Request, res: Response) {
  const user = req.user!;
  const where = user.role === 'STUDENT' ? { studentId: user.id } : {};
  const tickets = await prisma.ticket.findMany({
    where,
    include: includeTicket,
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
  res.json(tickets);
}

export async function create(req: Request, res: Response) {
  const body = ticketCreateSchema.parse(req.body);
  const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
  if (!student) throw new HttpError(404, 'Student profile not found');
  const ticket = await prisma.ticket.create({
    data: { studentId: student.userId, subject: body.subject, description: body.description },
    include: includeTicket,
  });
  res.status(201).json(ticket);
}

export async function getById(req: Request, res: Response) {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id as string }, include: includeTicket });
  if (!ticket) throw new HttpError(404, 'Ticket not found');
  if (req.user!.role === 'STUDENT' && ticket.studentId !== req.user!.id) {
    throw new HttpError(403, 'Not your ticket');
  }
  res.json(ticket);
}

export async function postMessage(req: Request, res: Response) {
  const body = messageSchema.parse(req.body);
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id as string } });
  if (!ticket) throw new HttpError(404, 'Ticket not found');
  if (req.user!.role === 'STUDENT' && ticket.studentId !== req.user!.id) {
    throw new HttpError(403, 'Not your ticket');
  }
  const message = await prisma.ticketMessage.create({
    data: { ticketId: ticket.id, authorId: req.user!.id, body: body.body },
    include: { author: { select: { id: true, name: true, role: true } } },
  });
  res.status(201).json(message);
}

export async function updateStatus(req: Request, res: Response) {
  const body = ticketStatusSchema.parse(req.body);
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id as string } });
  if (!ticket) throw new HttpError(404, 'Ticket not found');
  const isFaculty = req.user!.role === 'FACULTY';
  const isAdmin = req.user!.role === 'ADMIN';
  if (!isFaculty && !isAdmin) throw new HttpError(403, 'Only staff can change status');
  // Claim if unassigned.
  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: body.status,
      ...(isFaculty && !ticket.assignedToId ? { assignedToId: req.user!.id } : {}),
    },
    include: includeTicket,
  });
  res.json(updated);
}