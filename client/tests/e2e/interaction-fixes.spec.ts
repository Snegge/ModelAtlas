import {test,expect} from '@playwright/test';
for(const width of [390,1440]) {
 test(`variant binding, score hints and unobstructed anchors at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.goto('/');
  await page.getByLabel('GPU profile (searchable)').fill('5090');
  await page.getByRole('option',{name:/NVIDIA GeForce RTX 5090/}).click();
  const card=page.locator('.recommendation:visible');
  await expect(card).toContainText('Fits fully in GPU memory');
  const name=(await card.locator('.summary-heading > a').textContent())!.trim();
  await card.getByRole('button',{name:'Q8_0',exact:true}).click();
  await expect(card.locator('.summary-heading > a')).toHaveText(name);
  await expect(card.getByRole('button',{name:'Q8_0',exact:true})).toHaveAttribute('aria-pressed','true');
  const row=page.locator('.new-catalog tbody tr').filter({has:page.getByRole('link',{name,exact:true})});
  await expect(row.locator('mat-select')).toContainText('Q8_0');
  await expect(card).toContainText('0 / 100');
  await expect(card).toContainText(/Full GPU placement requires/);
  await card.getByRole('button',{name:'Q4_K_M',exact:true}).click();
  await expect(card).toContainText('Fits fully in GPU memory');
  await expect(row.locator('mat-select')).toContainText('Q4_K_M');
  await card.locator('.summary-heading strong').hover();
  await expect(page.locator('.mat-mdc-tooltip-show .mat-mdc-tooltip-surface')).toContainText('Quality 45%');
  await page.mouse.move(0,0);
  await page.getByRole('button',{name:'Bars',exact:true}).click();
  await expect(page.getByText('Score · 0–100',{exact:false})).toHaveCount(0);
  await page.locator('.score-row').first().hover();
  await expect(page.locator('.mat-mdc-tooltip-show .mat-mdc-tooltip-surface')).toContainText('VRAM use 15%');
  await page.mouse.move(0,0);
  await card.getByRole('link',{name:'Details',exact:true}).click();
  for(const fragment of ['model-fit','model-evidence','model-files','model-simulation']) {
    await page.locator(`.page-sections a[href$="#${fragment}"]`).click();
    await expect.poll(()=>page.evaluate(id=>document.getElementById(id)!.getBoundingClientRect().top-document.querySelector('.app-header')!.getBoundingClientRect().bottom,fragment)).toBeGreaterThanOrEqual(0);
  }
  await page.goto('/methodology');
  for(const fragment of ['score','memory','speed']) {
    await page.locator(`.method-nav a[href$="#${fragment}"]`).click();
    await expect.poll(()=>page.evaluate(id=>document.getElementById(id)!.getBoundingClientRect().top-document.querySelector('.app-header')!.getBoundingClientRect().bottom,fragment)).toBeGreaterThanOrEqual(0);
  }
  await page.goto('/discover');
  await page.getByRole('button',{name:'Learn more'}).click();
  await expect(page.getByRole('tab',{name:'Highlights',exact:true})).toBeFocused();
  await expect.poll(()=>page.locator('.discover-filters').evaluate(e=>e.getBoundingClientRect().top-document.querySelector('.app-header')!.getBoundingClientRect().bottom)).toBeGreaterThanOrEqual(0);
  if(width>800) {
    const delta=await page.evaluate(()=>Math.abs(document.querySelector('.discover-shortlist')!.getBoundingClientRect().top-document.querySelector('.discover-feature')!.getBoundingClientRect().top));
    expect(delta).toBeLessThan(1);
  }
  await page.getByRole('link',{name:'Explore the selection below'}).click();
  await expect(page.getByRole('tab',{name:'Highlights',exact:true})).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
