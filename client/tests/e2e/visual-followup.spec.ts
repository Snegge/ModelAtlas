import {test,expect,Page} from '@playwright/test';
async function trailingArrows(page:Page) {
  const issues=await page.locator('a.mat-mdc-button-base, button.mat-mdc-button-base:not(.mat-mdc-icon-button)').evaluateAll(es=>es.flatMap(e=>{
    const icon=e.querySelector<HTMLElement>('mat-icon[fonticon="arrow_forward"],mat-icon[fonticon="arrow_downward"]');
    const label=e.querySelector<HTMLElement>('.mdc-button__label');
    if(!icon||!label||!e.getBoundingClientRect().height)return [];
    const style=getComputedStyle(icon);
    return icon.getBoundingClientRect().left<label.getBoundingClientRect().right-1 || style.marginLeft !== '0px' || style.marginRight !== '0px' ? [e.textContent]:[];
  }));expect(issues).toEqual([]);
}
for(const width of [390,1440]) {
 test(`memory encodings, recommendation surface and linked Discover titles at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.goto('/');
  const card=page.locator('.recommendation:visible');
  await expect(card).toBeVisible();await expect(card.locator('.card-evidence')).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Your hardware',exact:true})).toBeVisible();
  expect(await page.locator('.hardware-form').evaluate(e=>{
    const s=getComputedStyle(e);return {background:s.backgroundColor,border:s.borderTopWidth,padding:s.padding};
  })).toEqual({background:'rgba(0, 0, 0, 0)',border:'0px',padding:'0px'});
  expect(await page.locator('.intro-grid').evaluate(e=>getComputedStyle(e).columnGap)).toBe('24px');
  await page.getByLabel('GPU profile (searchable)').fill('5090');await page.getByRole('option',{name:/NVIDIA GeForce RTX 5090/}).click();
  await expect(card).toContainText('Fits fully in GPU memory');
  const runtime=await card.locator('.memory-segment.runtime').evaluate(e=>getComputedStyle(e).backgroundColor);
  const reserve=await card.locator('.memory-segment.safety').evaluate(e=>getComputedStyle(e).backgroundColor);
  const free=await card.locator('.memory-track').evaluate(e=>getComputedStyle(e).backgroundColor);
  expect(new Set([runtime,reserve,free]).size).toBe(3);
  expect([runtime,reserve,free]).toEqual(['rgb(146, 117, 182)','rgb(184, 116, 137)','rgb(240, 243, 248)']);
  expect(await card.locator('.memory-track').evaluate(e=>getComputedStyle(e).borderTopWidth)).toBe('1px');
  for(let i=0;i<5;i++) {await expect(page.locator('.recommendation:visible .card-evidence')).toHaveCount(0);await page.getByRole('button',{name:'Next recommendation'}).click();}
  await trailingArrows(page);
  await page.goto('/discover');
  const title=page.locator('.highlight-card h2 a');await expect(title).toBeVisible();
  const href=await title.getAttribute('href');
  await trailingArrows(page);await title.click();await expect(page).toHaveURL(new RegExp(href!+'$'));
  await page.goto('/discover');await page.getByRole('button',{name:'Learn more'}).click();
  const feature=page.locator('.discover-feature h2 a');await expect(feature).toBeVisible();
  const featureHref=await feature.getAttribute('href');await feature.focus();await feature.press('Enter');
  await expect(page).toHaveURL(new RegExp(featureHref!+'$'));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
