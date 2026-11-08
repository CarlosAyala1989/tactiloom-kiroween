import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` throws outside React Server Components; tests import server modules directly.
      'server-only': fileURLToPath(new URL('./test/server-only-stub.ts', import.meta.url)),
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    env: {
      DATABASE_URL: 'postgresql://unused@localhost/unused',
      SESSION_SECRET: 'test-secret-test-secret',
      PUBLIC_ORIGIN: 'https://demo.tactiloom.test',
    },
  },
});
