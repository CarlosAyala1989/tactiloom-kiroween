import { expect, test } from '@playwright/test';

/**
 * Exercises the real browser camera code path (permission → getUserMedia → canvas snapshot →
 * analyze) using Chrome's FAKE capture device fed with a synthetic board clip. This proves the
 * UI flow, not physical recognition (see docs/benchmarking.md for physical tests).
 */
test('camera capture with Chrome fake device reaches OpenCV and compiles', async ({ page }) => {
  await page.goto('/studio');
  await page.getByRole('tab', { name: 'Cámara (física)' }).click();
  await page.getByRole('button', { name: 'Activar cámara' }).click();
  const video = page.getByLabel('Vista previa de la cámara');
  await expect(video).toBeVisible();
  await page.waitForFunction(() => ((document.querySelector('video') as HTMLVideoElement | null)?.videoWidth ?? 0) > 0);
  await page.getByRole('button', { name: 'Capturar foto' }).click();
  await expect(page.getByText('10 tarjetas reconocidas')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('compile-status')).toHaveText(/Programa válido/);
  await page.screenshot({ path: 'tests/e2e/.artifacts/07-fake-camera.png', fullPage: true });
});
