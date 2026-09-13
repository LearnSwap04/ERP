import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';

export interface TokenUser {
  id: string;
  role: Role;
  email: string;
}

export function signAccessToken(user: TokenUser): string {
  return jwt.sign({ role: user.role, email: user.email }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.ACCESS_TOKEN_TTL,
  });
}

export function signRefreshToken(user: TokenUser): string {
  const seconds = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;
  return jwt.sign({ role: user.role, email: user.email }, env.JWT_REFRESH_SECRET, {
    subject: user.id,
    expiresIn: seconds,
  });
}

export function verifyRefreshToken(token: string): TokenUser {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload & {
    role: Role;
    email: string;
  };
  if (!payload.sub) throw new Error('Refresh token missing subject');
  return { id: payload.sub, role: payload.role, email: payload.email };
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}