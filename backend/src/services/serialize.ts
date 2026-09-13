import type { User } from '@prisma/client';

export type PublicUser = Omit<User, 'passwordHash'>;

/** Strip the password hash before sending a user to the client. */
export function serializeUser<T extends User>(user: T): PublicUser {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}