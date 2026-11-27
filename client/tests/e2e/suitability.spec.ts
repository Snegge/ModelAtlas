import {chooseVariant} from "./variant";
import { test, expect, Page } from '@playwright/test';
async function gpu(page:Page, query:string) {
  const input=page.getByLabel('GPU profile (searchable)');
  await input.fill(query); await input.press('ArrowDown'); await input.press('Enter');
}
for (const width of [390, 1440]) {
  test(`speed reasons and hardware suitability, including retry, at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 }); await page.goto('/');
    await page.getByLabel('Search model or provider').fill('Qwen2.5-7B-Instruct');
    const row=page.locator('.new-catalog tbody tr'),speed=row.locator('td').nth(4),score=row.locator('td').nth(5);
    const context=page.getByLabel('Requested context · K tokens');
    await expect(row).toHaveCount(1); await expect(speed).toContainText('Select a GPU');
    await expect(score).toContainText('Not assessed');
    await gpu(page,'3060 · 12');
    await expect(speed).toContainText(/~\d+/); await expect(score).not.toContainText('Not assessed');
    const validScore=await score.textContent(),validSpeed=await speed.textContent();
    await page.getByLabel('System RAM · GiB').fill('1');
    await expect(speed).toHaveText(validSpeed!); await expect(score).toHaveText(validScore!);
    await gpu(page,'3050 · 6'); await chooseVariant(row.getByLabel('Variant'), 'Q8_0');
    await expect(speed).toContainText('Insufficient VRAM'); await expect(score).toContainText(/^\s*0 \/ 100/);
    await page.getByRole('button',{name:'Tiles',exact:true}).click();
    await expect(page.locator('.model-tile .summary-heading strong')).toContainText('0 / 100');
    await expect(page.locator('.model-tile .card-metrics')).toContainText('Insufficient VRAM');
    await page.screenshot({path:`test-results/unsuitable-${width}.png`,fullPage:true});
    await page.getByRole('button',{name:'Table',exact:true}).click();
    await gpu(page,'3060 · 12'); await chooseVariant(row.getByLabel('Variant'), 'Q4_K_M');
    await context.fill('256'); await expect(speed).toContainText('Context limit exceeded');
    await expect(score).toContainText(/^\s*0 \/ 100/);
    await context.fill('8'); await expect(speed).toContainText(/~\d+/);
    let release!:()=>void; const gate=new Promise<void>(resolve=>{release=resolve;});
    await page.route('**/api/evaluate',async route=>{await gate;await route.abort();});
    try { await context.fill('4'); await expect(speed).toContainText('Calculating'); await expect(score).toContainText('Calculating'); }
    finally {release();}
    await expect(speed).toContainText('Calculation unavailable'); await expect(score).toContainText('Not assessed');
    await page.unroute('**/api/evaluate'); await page.getByRole('button',{name:'Retry',exact:true}).click();
    await expect(speed).toContainText(/~\d+/); await expect(score).not.toContainText('Not assessed');
    await expect(speed).not.toContainText('Unknown');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
}
