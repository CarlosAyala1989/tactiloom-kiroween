import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

export * from './generated/prisma/client';
export { advisoryLock, consumeQuota, lockWorkspace, type QuotaKind } from './quota';

const globalForPrisma = globalThis as unknown as { __tactiloomPrisma?: PrismaClient };

export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** Process-wide Prisma client (cached on globalThis to survive Next.js dev reloads). */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.__tactiloomPrisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL no está configurada');
    }
    globalForPrisma.__tactiloomPrisma = createPrismaClient(connectionString);
  }
  return globalForPrisma.__tactiloomPrisma;
}
