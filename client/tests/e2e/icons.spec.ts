import { test, expect, Page } from "@playwright/test";
async function checkIcons(page: Page) {
  await page.evaluate(() => document.fonts.load('20px "Material Icons"'));
  expect(await page.evaluate(() => document.fonts.check('20px "Material Icons"'))).toBe(true);
  await expect.poll(() => page.locator('mat-icon:visible').evaluateAll(icons => icons.flatMap(icon => {
    const r = icon.getBoundingClientRect();
    const style = getComputedStyle(icon);
    const context = document.createElement('canvas').getContext('2d')!;
    context.font = '20px "Material Icons"';
    const glyphWidth = context.measureText(icon.getAttribute('fonticon') ?? '').width;
    return Math.abs(glyphWidth - 20) > 0.1 || r.width !== 20 || r.height !== 20 || !style.fontFamily.includes('Material Icons') || !icon.getAttribute('fonticon') || icon.querySelector('svg') !== null || icon.getAttribute('aria-hidden') !== 'true' ? [{name:icon.getAttribute("fonticon"), width:r.width, height:r.height, glyphWidth, font:style.fontFamily, hidden:icon.getAttribute("aria-hidden")}] : [];
  }))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
for (const width of [390, 768, 1440]) test(`Material icons render without layout drift at ${width}`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if(m.type() === 'error') errors.push(m.text()); });
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await expect(page.locator('.new-catalog tbody tr').first()).toBeVisible();
  await checkIcons(page);
  const star = page.locator('.recommendation:visible atlas-favourite-button button');
  await star.click();
  await expect(star.locator('mat-icon')).toHaveAttribute('fonticon', 'star');
  await checkIcons(page);
  await page.getByRole('button', {name:'Dismiss notification'}).click();
  for (const view of ['Tiles', 'Bars', 'Plot', 'Table']) {
    await page.getByRole('button', {name:view, exact:true}).click();
    await checkIcons(page);
  }
  await page.locator('.recommendation:visible .details-link').click();
  await expect(page.locator('.model-files')).toBeVisible();
  await checkIcons(page);
  await page.goto('/discover');
  await expect(page.locator('.highlight-card')).toBeVisible();
  await checkIcons(page);
  await page.screenshot({path:`test-results/material-icons-${width}.png`,fullPage:true});
  expect(errors).toEqual([]);
});
