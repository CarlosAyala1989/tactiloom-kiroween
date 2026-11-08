import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: new URL('.', import.meta.url).pathname,
    include: ['**/*.test.ts'],
    globalSetup: ['./global-setup.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
