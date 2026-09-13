import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HttpError } from '../middleware/errorHandler';
import { serializeUser } from '../services/serialize';
import type { Role } from '@prisma/client';

const baseUser = {
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  phone: z.string().optional(),
};

export const createUserSchema = z.discriminatedUnion('role', [
  z.object({
    ...baseUser,
    role: z.literal('STUDENT'),
    rollNo: z.string().min(1),
    course: z.string().min(1),
    branch: z.string().min(1),
    semester: z.coerce.number().int().positive(),
    enrollmentYear: z.coerce.number().int().positive(),
  }),
  z.object({
    ...baseUser,
    role: z.literal('FACULTY'),
    empId: z.string().min(1),
    department: z.string().min(1),
    designation: z.string().min(1),
  }),
  z.object({ ...baseUser, role: z.literal('ADMIN') }),
]);

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

const roles: Role[] = ['STUDENT', 'FACULTY', 'ADMIN'];

export async function list(req: Request, res: Response) {
  const role = typeof req.query.role === 'string' && roles.includes(req.query.role as Role) ? (req.query.role as Role) : undefined;
  const users = await prisma.user.findMany({
    where: role ? { role } : undefined,
    include: { studentProfile: true, facultyProfile: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json(users.map(serializeUser));
}

export async function create(req: Request, res: Response) {
  const data = req.body as z.infer<typeof createUserSchema>;
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name,
      role: data.role,
      phone: data.phone,
      ...(data.role === 'STUDENT'
        ? {
            studentProfile: {
              create: {
                rollNo: data.rollNo,
                course: data.course,
                branch: data.branch,
                semester: data.semester,
                enrollmentYear: data.enrollmentYear,
              },
            },
          }
        : {}),
      ...(data.role === 'FACULTY'
        ? {
            facultyProfile: {
              create: { empId: data.empId, department: data.department, designation: data.designation },
            },
          }
        : {}),
    },
    include: { studentProfile: true, facultyProfile: true },
  });
  res.status(201).json(serializeUser(user));
}

export async function update(req: Request, res: Response) {
  const data = req.body as z.infer<typeof updateUserSchema>;
  const existing = await prisma.user.findUnique({ where: { id: req.params.id as string } });
  if (!existing) throw new HttpError(404, 'User not found');
  const user = await prisma.user.update({
    where: { id: existing.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 10) } : {}),
    },
    include: { studentProfile: true, facultyProfile: true },
  });
  res.json(serializeUser(user));
}