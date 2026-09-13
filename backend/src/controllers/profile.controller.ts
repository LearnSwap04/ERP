import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HttpError } from '../middleware/errorHandler';
import { serializeUser } from '../services/serialize';

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  studentProfile: z
    .object({
      branch: z.string().min(1).optional(),
      semester: z.coerce.number().int().positive().optional(),
    })
    .optional(),
  facultyProfile: z
    .object({
      department: z.string().min(1).optional(),
      designation: z.string().min(1).optional(),
    })
    .optional(),
});

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { studentProfile: true, facultyProfile: true },
  });
  if (!user) throw new HttpError(404, 'User not found');
  res.json(serializeUser(user));
}

export async function updateMe(req: Request, res: Response) {
  const body = req.body as z.infer<typeof updateProfileSchema>;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw new HttpError(404, 'User not found');

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
      ...(body.studentProfile && user.role === 'STUDENT'
        ? {
            studentProfile: {
              update: {
                branch: body.studentProfile.branch,
                semester: body.studentProfile.semester,
              },
            },
          }
        : {}),
      ...(body.facultyProfile && user.role === 'FACULTY'
        ? {
            facultyProfile: {
              update: {
                department: body.facultyProfile.department,
                designation: body.facultyProfile.designation,
              },
            },
          }
        : {}),
    },
    include: { studentProfile: true, facultyProfile: true },
  });
  res.json(serializeUser(updated));
}