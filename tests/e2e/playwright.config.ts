import { defineConfig } from '@playwright/test';
import { fakeCameraVideo } from './fake-camera';

/**
 * E2E against a running stack (`docker compose up --build` or scripts/dev/*.sh).
 * Uses the system Google Chrome (no browser download). The "camera" project feeds Chrome's
 * fake capture device with a synthetic board video — it exercises the real getUserMedia code
 * path but is NOT a physical camera test.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3210';

export default defineConfig({
  testDir: '.',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: '../../test-results/e2e',
  reporter: [['list'], ['html', { outputFolder: '../../playwright-report', open: 'never' }]],
  use: {
    baseURL,
    channel: 'chrome',
    headless: true,
    locale: 'es-PE',
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    acceptDownloads: true,
  },
  projects: [
    { name: 'remote-demo', testMatch: /demo\.spec\.ts|simulator\.spec\.ts|a11y\.spec\.ts/ },
    {
      name: 'fake-camera',
      testMatch: /camera\.spec\.ts/,
      use: {
        permissions: ['camera'],
        launchOptions: {
          args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${fakeCameraVideo()}`],
        },
      },
    },
  ],
});
