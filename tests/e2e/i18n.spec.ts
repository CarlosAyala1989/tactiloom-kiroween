import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3210';
const shots = (name: string) => `tests/e2e/.artifacts/${name}.png`;

/** The preference the header switcher stores (each test starts from a fresh context without it). */
async function chooseLanguage(context: BrowserContext, locale: 'es' | 'en' | 'it' | 'fr'): Promise<void> {
  await context.addCookies([{ name: 'tactiloom_locale', value: locale, url: BASE_URL }]);
}

async function expectNoBlockingAxeViolations(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const blocking = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
  expect(blocking.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}

test.describe('languages: Spanish by default, English, Italian and French on demand', () => {
  test('the header switcher changes the language and html lang, and the choice survives a reload', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Historial' })).toBeVisible();

    await page.getByTestId('language-switcher').selectOption('en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Build workflows with your hands. Run them on your computer.');
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'History' })).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByTestId('language-switcher')).toHaveValue('en');
    const body = (await page.locator('main').innerText()).toLowerCase();
    for (const spanish of ['tarjeta', 'tablero', 'casilla', 'ejecución']) expect(body).not.toContain(spanish);

    await page.getByTestId('language-switcher').selectOption('it');
    await expect(page.getByRole('link', { name: 'Cronologia' })).toBeVisible();
    await page.getByTestId('language-switcher').selectOption('fr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.getByRole('link', { name: 'Historique' })).toBeVisible();
  });

  test.describe('without a stored choice', () => {
    test.use({ locale: 'fr-FR' });

    test('a browser that prefers French gets French (Accept-Language)', async ({ page }) => {
      await page.goto('/how-it-works');
      await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Comment ça marche');
      await expect(page).toHaveTitle(/Comment ça marche · Tactiloom/);
    });
  });

  test('English: gallery → OpenCV → compile → dry-run → approval → English report', async ({ page, context }) => {
    await chooseLanguage(context, 'en');
    await page.goto('/gallery');
    await page.getByTestId('analyze-valid-board-perspective').click();
    await expect(page.getByText('10 cards recognised')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('compile-status')).toHaveText(/Valid program/);
    const input = page.getByLabel('Input document (FILE card)');
    await expect(input).toHaveValue(/.+/);
    expect(await input.evaluate((select: HTMLSelectElement) => select.selectedOptions[0]?.textContent ?? '')).toContain('valid-application-en.pdf');
    await page.screenshot({ path: shots('10-en-studio'), fullPage: true });

    await page.getByTestId('save-version').click();
    await expect(page).toHaveURL(/\/versions\//);
    await expect(page.getByTestId('version-valid')).toHaveText(/valid/);
    await expect(page.getByLabel('Report language')).toHaveValue('en');

    await page.getByTestId('start-review').click();
    const approve = page.getByTestId('approve-run');
    await expect(approve).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('YES (TRUE branch)')).toBeVisible();
    await expect(page.getByText(/Save the Markdown report \(\d[\d,]* bytes\)/)).toBeVisible();
    await page.getByTestId('confirm-checkbox').check();
    await approve.click();

    await expect(page.getByTestId('artifacts')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('The run followed the approved plan exactly')).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('download-REPORT_MARKDOWN').click();
    const report = await readFile((await (await downloadPromise).path()) as string, 'utf8');
    expect(report).toContain('# Workshop application report');
    expect(report).toContain('Alice Sample Rivers');
    expect(report).toContain('VALID — all required fields present');
    await page.screenshot({ path: shots('11-en-execution-monitor'), fullPage: true });
  });

  test('Italian: a card between two cells is explained in Italian, with card and cells', async ({ page, context }) => {
    await chooseLanguage(context, 'it');
    await page.goto('/studio?scenario=invalid-board-ambiguous');
    await expect(page.getByTestId('compile-status')).toHaveText(/non si compila/, { timeout: 30_000 });
    const diagnostic = page.locator('[data-code="AMBIGUOUS_POSITION"]').first();
    await expect(diagnostic).toContainText('Carta tra due caselle');
    await expect(diagnostic).toContainText('La carta #15 (CREA REPORT) si trova tra le caselle (0,5) e (1,5).');
    await expect(diagnostic).toContainText('Centrala in una sola casella');
    await page.screenshot({ path: shots('12-it-ambiguous'), fullPage: true });
  });

  test('French: the printable kit lists the French files and serves the French ZIP', async ({ page, context }) => {
    await chooseLanguage(context, 'fr');
    await page.goto('/kit');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kit imprimable');
    const zip = page.getByRole('link', { name: 'Tout télécharger (ZIP)' });
    const zipUrl = (await zip.getAttribute('href')) as string;
    expect(zipUrl).toContain('locale=fr');
    expect(zipUrl).toContain('tactiloom-board-kit-fr.zip');
    const archive = await page.request.get(zipUrl);
    expect(archive.status()).toBe(200);
    expect(archive.headers()['content-type']).toBe('application/zip');
    const board = await page.request.get((await page.getByRole('link', { name: 'board-v1-a3.pdf' }).getAttribute('href')) as string);
    expect(board.status()).toBe(200);
    expect(board.headers()['content-language']).toBe('fr');
    expect((await board.body()).subarray(0, 5).toString()).toBe('%PDF-');
  });

  for (const [locale, path] of [
    ['en', '/studio'],
    ['it', '/simulator'],
    ['fr', '/help'],
  ] as const) {
    test(`no serious or critical axe violations on ${path} in ${locale}`, async ({ page, context }) => {
      await chooseLanguage(context, locale);
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expectNoBlockingAxeViolations(page);
    });
  }
});
