import { expect, test, type Page } from '@playwright/test';

/** Page background of each theme (globals.css: --color-ink-900). */
const BACKGROUND = { light: 'rgb(246, 241, 232)', dark: 'rgb(25, 21, 15)' } as const;

async function expectTheme(page: Page, theme: keyof typeof BACKGROUND): Promise<void> {
  await expect(page.locator('body')).toHaveCSS('background-color', BACKGROUND[theme]);
}

test.describe('light and dark themes', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`operating system in ${colorScheme} mode`, () => {
      test.use({ colorScheme });

      test(`without a stored choice the page follows the system (${colorScheme})`, async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('html')).not.toHaveAttribute('data-theme');
        await expect(page.getByRole('radio', { name: 'Tema del sistema' })).toBeChecked();
        await expectTheme(page, colorScheme);
      });
    });
  }

  test.describe('with a dark operating system', () => {
    test.use({ colorScheme: 'dark' });

    test('the header switcher pins the light theme, the server keeps it after a reload, and "system" lets the OS decide again', async ({ page }) => {
      await page.goto('/');
      await expectTheme(page, 'dark');

      await page.getByRole('radio', { name: 'Tema claro' }).check();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      await expectTheme(page, 'light');

      // Rendered by the server from the cookie, so the first paint is already light (no flash).
      const html = await (await page.request.get('/')).text();
      expect(html).toMatch(/<html[^>]*data-theme="light"/);
      await page.reload();
      await expectTheme(page, 'light');
      await expect(page.getByRole('radio', { name: 'Tema claro' })).toBeChecked();

      await page.getByRole('radio', { name: 'Tema del sistema' }).check();
      await expect(page.locator('html')).not.toHaveAttribute('data-theme');
      await expectTheme(page, 'dark');
    });

    test('the switcher works from the keyboard and shows where the focus is', async ({ page }) => {
      await page.goto('/');
      const system = page.getByRole('radio', { name: 'Tema del sistema' });
      await system.focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('radio', { name: 'Tema claro' })).toBeChecked();
      await expect(page.getByRole('radio', { name: 'Tema claro' })).toBeFocused();
      await expectTheme(page, 'light');
      await expect(page.getByTestId('theme-switcher').locator('label').nth(1)).toHaveCSS('outline-style', 'solid');

      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('radio', { name: 'Tema oscuro' })).toBeChecked();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expectTheme(page, 'dark');
    });
  });
});
