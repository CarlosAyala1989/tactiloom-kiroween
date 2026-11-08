import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const shots = (name: string) => `tests/e2e/.artifacts/${name}.png`;

test.describe('remote demo without camera (judges path)', () => {
  test('gallery image → OpenCV → compile → dry-run → approval → real report; then invalid document → review task', async ({ page }) => {
    await page.goto('/gallery');
    await page.getByTestId('analyze-valid-board-perspective').click();
    await expect(page).toHaveURL(/\/studio\?scenario=valid-board-perspective/);
    await expect(page.getByText('10 tarjetas reconocidas')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('compile-status')).toHaveText(/Programa válido/);
    await expect(page.getByLabel('Documento de entrada (tarjeta ARCHIVO)')).toHaveValue(/.+/);
    await page.screenshot({ path: shots('01-studio-detection'), fullPage: true });

    await page.getByTestId('save-version').click();
    await expect(page).toHaveURL(/\/versions\//);
    await expect(page.getByTestId('version-valid')).toHaveText(/válido/);
    await page.screenshot({ path: shots('02-workflow-studio'), fullPage: true });

    await page.getByTestId('start-review').click();
    await expect(page).toHaveURL(/\/runs\//);
    const approve = page.getByTestId('approve-run');
    await expect(approve).toBeVisible({ timeout: 60_000 });
    await expect(approve).toBeDisabled();
    await expect(page.getByText('SÍ (rama TRUE)')).toBeVisible();
    await page.screenshot({ path: shots('03-review-and-run'), fullPage: true });
    await page.getByTestId('confirm-checkbox').check();
    await approve.click();

    await expect(page.getByTestId('artifacts')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('La ejecución siguió exactamente el plan aprobado')).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('download-REPORT_MARKDOWN').click();
    const download = await downloadPromise;
    const report = await readFile((await download.path()) as string, 'utf8');
    expect(report).toContain('# Reporte de solicitud de taller');
    expect(report).toContain('Ana Ejemplo Ríos');
    expect(report).toContain('VÁLIDA');
    await page.screenshot({ path: shots('04-execution-monitor'), fullPage: true });

    // Same board, other input: a new version (new hash) that takes the FALSE branch.
    await page.getByRole('link', { name: /Workflow Studio/ }).click();
    await expect(page).toHaveURL(/\/versions\//);
    const select = page.getByLabel('Documento de entrada').first();
    const invalidValue = await select.locator('option', { hasText: 'invalid-application.pdf' }).getAttribute('value');
    await select.selectOption(invalidValue as string);
    await page.getByTestId('save-params').click();
    await expect(page.getByTestId('start-review')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('start-review').click();
    await expect(page.getByTestId('approve-run')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('NO (rama FALSE)')).toBeVisible();
    await page.getByTestId('confirm-checkbox').check();
    await page.getByTestId('approve-run').click();
    const tasks = page.getByTestId('review-tasks');
    await expect(tasks).toBeVisible({ timeout: 60_000 });
    await expect(tasks).toContainText('OPEN');
    await expect(tasks).toContainText('workshop');
    await expect(page.getByTestId('artifacts')).toHaveCount(0);

    await page.goto('/history');
    await expect(page.getByTestId('history-runs').locator('li')).toHaveCount(2);
    await page.screenshot({ path: shots('05-history'), fullPage: true });
  });

  test('a board with a card between cells cannot run and says where', async ({ page }) => {
    await page.goto('/studio?scenario=invalid-board-ambiguous');
    await expect(page.getByTestId('compile-status')).toHaveText(/no compila/, { timeout: 30_000 });
    const diagnostic = page.locator('[data-code="AMBIGUOUS_POSITION"]').first();
    await expect(diagnostic).toContainText('(0,5)');
    await expect(diagnostic).toContainText('#15');
    await page.getByTestId('save-version').click();
    await expect(page.getByTestId('version-valid')).toHaveText(/inválido/);
    await expect(page.getByTestId('start-review')).toHaveCount(0);
    await expect(page.getByText('no existe botón de ejecución')).toBeVisible();
  });

  test('a hidden corner marker is explained', async ({ page }) => {
    await page.goto('/studio?scenario=invalid-board-missing-corner');
    await expect(page.locator('[data-code="BOARD_FIDUCIAL_MISSING"]').first()).toContainText('inferior derecha', { timeout: 30_000 });
    await expect(page.getByText('Sin calibrar')).toBeVisible();
  });

  test('a corrupt upload is rejected with a clear message', async ({ page }) => {
    await page.goto('/studio');
    const corruptPng = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('not really a png')]);
    await page.locator('#board-file').setInputFiles({ name: 'board.png', mimeType: 'image/png', buffer: corruptPng });
    await expect(page.locator('p[role="alert"]')).toContainText(/IMAGE_CORRUPT/);
  });

  test('a file that is not an image is rejected by content, not by extension', async ({ page }) => {
    await page.goto('/studio');
    await page.locator('#board-file').setInputFiles({ name: 'board.png', mimeType: 'image/png', buffer: Buffer.from('%PDF-1.7 fake') });
    await expect(page.locator('p[role="alert"]')).toContainText(/UNSUPPORTED_IMAGE_TYPE/);
  });
});
