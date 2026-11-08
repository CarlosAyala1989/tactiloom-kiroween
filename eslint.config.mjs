import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const scopeToWeb = (configs) => configs.map((config) => ({ ...config, files: ['apps/web/**/*.{ts,tsx,js,jsx,mjs}'] }));

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/.next/**',
    '**/next-env.d.ts',
    'packages/db/src/generated/**',
    'services/**',
    'assets/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'tests/e2e/.artifacts/**',
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Security steering: no dynamic code execution anywhere in the codebase.
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    // Product code must never spawn processes; only tests/scripts may (with fixed argv).
    files: ['apps/**/*.{ts,tsx}', 'packages/**/src/**/*.{ts,mjs}'],
    rules: {
      'no-restricted-imports': ['error', { paths: [{ name: 'child_process', message: 'Prohibido en código de producto (ver .kiro/steering/security.md).' }, { name: 'node:child_process', message: 'Prohibido en código de producto (ver .kiro/steering/security.md).' }] }],
    },
  },
  ...scopeToWeb(nextVitals),
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    settings: { next: { rootDir: 'apps/web/' } },
    // App Router only: the pages-directory rule does not apply.
    rules: { '@next/next/no-html-link-for-pages': 'off' },
  },
]);
