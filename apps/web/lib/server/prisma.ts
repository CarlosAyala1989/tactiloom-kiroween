import 'server-only';
import { getPrisma, type Prisma } from '@tactiloom/db';

export const prisma = () => getPrisma();

export function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
