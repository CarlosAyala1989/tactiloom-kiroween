import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// Monorepo: load the root .env (DATABASE_URL, SESSION_SECRET, …) for local development.
loadEnvConfig(path.join(import.meta.dirname, '..', '..'), process.env.NODE_ENV !== 'production');

const isProduction = process.env.NODE_ENV === 'production';

// Strict CSP in production. Next.js hydration needs inline scripts; camera frames and the
// overlay are shown as blob:/data: URLs. No third-party origins are contacted.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(isProduction ? [{ key: 'Content-Security-Policy', value: csp }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingRoot: path.join(import.meta.dirname, '..', '..'),
  transpilePackages: ['@tactiloom/contracts', '@tactiloom/compiler', '@tactiloom/board-kit', '@tactiloom/workflow-engine', '@tactiloom/db'],
  serverExternalPackages: ['pg', '@prisma/adapter-pg', '@prisma/client'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
