import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { HttpError } from '../middleware/errorHandler';
import { serializeUser } from '../services/serialize';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token';
import type { User } from '@prisma/client';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(1) });

export const forgotSchema = z.object({ email: z.string().email() });

export const resetSchema = z.object({ token: z.string().min(1), password: z.string().min(6) });

async function issueTokens(user: User) {
  const tokenUser = { id: user.id, role: user.role, email: user.email };
  const accessToken = signAccessToken(tokenUser);
  const refreshToken = signRefreshToken(tokenUser);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return { accessToken, refreshToken, user: serializeUser(user) };
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    throw new HttpError(401, 'Invalid email or password');
  }
  if (!user.isActive) {
    throw new HttpError(403, 'Account is disabled. Contact the administrator.');
  }
  res.json(await issueTokens(user));
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body);
  let tokenUser;
  try {
    tokenUser = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, 'Invalid or expired refresh token');
  }
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new HttpError(401, 'Refresh token has been revoked or expired');
  }
  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || !user.isActive) {
    throw new HttpError(401, 'Account unavailable');
  }
  // Rotate: revoke old token, issue a fresh pair.
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  res.json(await issueTokens(user));
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.safeParse(req.body).success
    ? req.body
    : { refreshToken: '' };
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  res.json({ ok: true });
}

/** Generate a reset token. In dev we return the reset link so the flow can be demoed without SMTP. */
export async function forgotPassword(req: Request, res: Response) {
  const { email } = forgotSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    // Always respond ok to avoid user enumeration.
    res.json({ ok: true });
    return;
  }
  const resetToken = jwt.sign({ kind: 'password-reset' }, env.JWT_REFRESH_SECRET, {
    subject: user.id,
    expiresIn: 1800,
  });
  const dev = process.env.NODE_ENV !== 'production';
  console.log(`[dev] Password reset link for ${user.email}: /auth/reset?token=${resetToken}`);
  res.json({ ok: true, devOnlyResetLink: dev ? `/auth/reset?token=${encodeURIComponent(resetToken)}` : undefined });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = resetSchema.parse(req.body);
  let sub: string;
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload & { kind?: string };
    if (payload.kind !== 'password-reset' || !payload.sub) throw new Error('bad token');
    sub = payload.sub;
  } catch {
    throw new HttpError(401, 'Invalid or expired reset token');
  }
  const user = await prisma.user.findUnique({ where: { id: sub } });
  if (!user) throw new HttpError(404, 'User not found');
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  // Invalidate existing sessions.
  await prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { studentProfile: true, facultyProfile: true },
  });
  if (!user) throw new HttpError(404, 'User not found');
  res.json(serializeUser(user));
}

