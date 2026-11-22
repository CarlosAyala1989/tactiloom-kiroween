import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = ['/', '/how-it-works', '/gallery', '/studio', '/simulator', '/kit', '/help', '/history'];

/** Page background of each theme (globals.css: --color-ink-900), to be sure the theme under test applied. */
const BACKGROUND = { light: 'rgb(246, 241, 232)', dark: 'rgb(25, 21, 15)' } as const;

// Without a stored choice the page follows the operating system, so emulating it selects the theme.
for (const colorScheme of ['dark', 'light'] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    for (const path of PAGES) {
      test(`no serious or critical axe violations on ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toHaveCSS('background-color', BACKGROUND[colorScheme]);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
        const blocking = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
        expect(blocking.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
      });
    }
  });
}
