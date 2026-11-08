import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadRunnerConfig, REPO_ROOT } from '../src/config';

describe('runner configuration', () => {
  it('requires DATABASE_URL', () => {
    expect(() => loadRunnerConfig({})).toThrow();
  });

  it('applies safe defaults and resolves relative sandbox paths against the repository root', () => {
    const config = loadRunnerConfig({ DATABASE_URL: 'postgresql://x@localhost/db' });
    expect(config.workspaceRoot).toBe(path.join(REPO_ROOT, '.data', 'workspace'));
    expect(config.leaseMs).toBe(30_000);
    expect(config.maxAttempts).toBe(3);
    expect(config.maxDurationMs).toBe(60_000);
    expect(config.runnerId).toMatch(/^runner-/);
  });

  it('rejects unsafe or absurd values', () => {
    expect(() => loadRunnerConfig({ DATABASE_URL: 'x', RUNNER_LEASE_MS: '10' })).toThrow();
    expect(() => loadRunnerConfig({ DATABASE_URL: 'x', RUNNER_MAX_ATTEMPTS: '50' })).toThrow();
    expect(() => loadRunnerConfig({ DATABASE_URL: 'x', RUNNER_ID: '../etc' })).toThrow();
  });

  it('keeps absolute sandbox paths', () => {
    expect(loadRunnerConfig({ DATABASE_URL: 'x', WORKSPACE_ROOT: '/workspace' }).workspaceRoot).toBe('/workspace');
  });
});
