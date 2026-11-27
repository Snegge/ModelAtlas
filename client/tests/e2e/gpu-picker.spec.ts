import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 1440]) {
  test(`Material GPU search preserves general recommendations and commits only selections at ${width}`, async ({page, request}) => {
    const errors:string[]=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.setViewportSize({width,height:1000});
    const catalog=await (await request.get('/api/catalog')).json();
    await page.goto('/');
    const input=page.getByLabel('GPU profile (searchable)');
    const cards=page.locator('.recommendation');
    const rows=page.locator('.new-catalog tbody tr');
    const specs=page.locator('.hardware-specs');
    await expect(cards).toHaveCount(5); await expect(rows).toHaveCount(catalog.releases.length);
    await expect(input).toHaveValue('');
    await expect(page.getByText('Popular starting points, ordered by recent downloads.',{exact:false})).toBeVisible();
    await expect(page.locator('mat-form-field.gpu-field input.mat-mdc-input-element')).toHaveCount(1);
    await input.fill('3090');
    await expect(page.locator('mat-option')).toHaveCount(2);
    expect(await input.evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('none');
    expect(await page.locator('mat-option').first().evaluate(el=>getComputedStyle(el).fontFamily)).not.toBe('Roboto');
    await expect(cards).toHaveCount(5);await expect(rows).toHaveCount(catalog.releases.length);
    const box=await input.boundingBox(), panel=await page.locator('.mat-mdc-autocomplete-panel').boundingBox();
    expect(panel!.y).toBeGreaterThan(box!.y);expect(panel!.x+panel!.width).toBeLessThanOrEqual(width);
    await page.getByRole('option',{name:'NVIDIA GeForce RTX 3090 · 24 GB',exact:true}).click();
    await expect(input).toHaveValue('NVIDIA GeForce RTX 3090 · 24 GB');
    await expect(specs).toContainText('24 GiB');await expect(specs).toContainText('936 GB/s');
    await expect(cards.first()).toContainText('Fits fully in GPU memory');
    await expect(page.getByRole('link',{name:'NVIDIA specifications'})).toHaveCount(0);

    await input.fill('not a graphics card');
    await expect(page.locator('mat-option')).toContainText('No matching graphics cards');
    await expect(specs).toContainText('24 GiB');await expect(cards).toHaveCount(5);
    await page.getByLabel('System RAM · GiB').click();
    await expect(input).toHaveValue('NVIDIA GeForce RTX 3090 · 24 GB');
    await input.fill('3060 · 12');await expect(page.locator('mat-option')).toHaveCount(1);
    await input.press('ArrowDown');await input.press('Enter');
    await expect(specs).toContainText('12 GiB');await expect(specs).toContainText('360 GB/s');
    await page.reload();await expect(input).toHaveValue('NVIDIA GeForce RTX 3060 · 12 GB');
    await expect(cards.first()).toContainText('Fits fully in GPU memory');
    await page.getByRole('button',{name:'Clear GPU selection'}).click();
    await expect(input).toHaveValue('');await expect(cards).toHaveCount(5);
    await expect(rows).toHaveCount(catalog.releases.length);
    await expect(page.getByRole('region',{name:'Popular models · recent HF downloads',exact:true})).toBeVisible();
    await expect(specs).toContainText('— GiB');
    await input.fill('5090');await page.getByRole('option',{name:/NVIDIA GeForce RTX 5090/}).click();
    await input.fill('');await input.press('Tab');
    await expect(specs).toContainText('— GiB');await expect(cards).toHaveCount(5);
    await input.fill('5090');await page.getByRole('option',{name:/NVIDIA GeForce RTX 5090/}).click();
    await page.getByRole('button',{name:'Reset exploration'}).click();
    await expect(input).toHaveValue('');await expect(cards).toHaveCount(5);
    await page.reload();await expect(input).toHaveValue('');await expect(cards).toHaveCount(5);
    expect(errors).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await page.screenshot({path:`test-results/gpu-picker-${width}.png`});
  });
}

test('old backend catalog gives an actionable error instead of crashing, then recovers',async({page,request})=>{
  const catalog=await (await request.get('/api/catalog')).json();
  for(const r of catalog.releases) delete r.qualityRating;
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/catalog',route=>route.fulfill({json:catalog}));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Restart the ModelAtlas backend');
  expect(errors).toEqual([]);
  await page.unroute('**/api/catalog');await page.getByRole('button',{name:'Retry',exact:true}).click();
  await expect(page.locator('.recommendation')).toHaveCount(5);
  await expect(page.locator('.new-catalog tbody tr')).toHaveCount(catalog.releases.length);
});
