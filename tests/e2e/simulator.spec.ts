import { expect, test } from '@playwright/test';

test('simulator is labelled, uses the same compiler and reacts to rotations from the keyboard', async ({ page }) => {
  await page.goto('/simulator');
  await expect(page.getByRole('note')).toHaveText('Simulador digital: no utiliza cámara');
  const status = page.getByTestId('compile-status');
  await expect(status).toHaveText(/Programa válido/, { timeout: 20_000 });

  // Rotate EXTRACT_TEXT #12 at (0,2): its input side no longer faces INPUT_FILE.
  const cell = page.locator('[data-cell="0,2"]');
  await cell.focus();
  await page.keyboard.press('r');
  await expect(status).toHaveText(/no compila/);
  await expect(page.locator('[data-code="INCOMPATIBLE_PORTS"]').first()).toContainText('#12');
  await expect(cell).toHaveAttribute('aria-label', /con error/);
  await page.screenshot({ path: 'tests/e2e/.artifacts/06-simulator-error.png', fullPage: true });

  // Three more quarter turns → back to East → valid again.
  for (let i = 0; i < 3; i += 1) await page.keyboard.press('r');
  await expect(status).toHaveText(/Programa válido/);

  // Remove END #19 with the keyboard → the FALSE branch no longer terminates.
  await page.locator('[data-cell="2,4"]').focus();
  await page.keyboard.press('Delete');
  await expect(status).toHaveText(/no compila/);
  await expect(page.locator('[data-code="NONTERMINATING_PATH"]').first()).toBeVisible();

  // Put it back from the palette with the mouse.
  await page.getByRole('button', { name: /Elegir tarjeta #19/ }).click();
  await page.locator('[data-cell="2,4"]').click();
  await page.locator('[data-cell="2,4"]').focus();
  await page.keyboard.press('r'); // E → S
  await expect(status).toHaveText(/Programa válido/);
});
