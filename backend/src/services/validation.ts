import { z } from 'zod';

/** Shared, reusable zod schemas. */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const idParam = z.object({ id: z.string().min(1) });

export const parseDate = (value: string): Date => new Date(`${value}T00:00:00.000Z`);