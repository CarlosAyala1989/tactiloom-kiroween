import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7: the datasource URL is configured here (not in schema.prisma).
// `prisma generate` does not connect to the database, so a missing DATABASE_URL only
// fails commands that actually need a connection (migrate, db seed).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
