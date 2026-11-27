import {test,expect} from '@playwright/test';
for(const width of [390,768,1440]) {
 test(`stable sorting, uniform collections and 100-point bar at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.goto('/');
  await expect(page.locator('.new-catalog tbody tr').first()).toBeVisible();
  await expect(page.locator('.new-catalog td[data-label="Model"] small')).toHaveCount(0);
  await expect(page.getByText('Suitability score',{exact:false})).toHaveCount(0);
  const gap=await page.evaluate(()=>{
    const intro=document.querySelector('.intro-grid')!.getBoundingClientRect();
    return document.querySelector('.catalog-layout')!.getBoundingClientRect().top-intro.bottom;
  });expect(gap).toBeLessThanOrEqual(24);
  if(width>800) {
    const bounds=()=>page.locator('.new-catalog th').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,w:r.width,h:r.height};}));
    const original=await bounds();
    for(const name of ['Model','Parameters','Max context','VRAM','Speed tokens/s','Score']) {
      await page.getByRole('button',{name,exact:true}).click();
      expect(await bounds()).toEqual(original);
    }
    const inset=await page.locator('.mat-sort-header-container').first().evaluate(e=>{const a=e.getBoundingClientRect(),b=e.querySelector('.mat-sort-header-content')!.getBoundingClientRect();return b.x-a.x;});
    expect(inset).toBeGreaterThanOrEqual(8);
  }
  expect(await page.getByRole('button',{name:'Next recommendation'}).evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(255, 255, 255)');
  await page.goto('/discover');
  for(const tab of ['Highlights','New Releases','Most discussed','Popular']) {
    const filter=page.getByRole('tab',{name:tab,exact:true});await filter.click();
    expect((await filter.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(page.locator('.discover-shortlist button')).toHaveCount(10);
    const issues=await page.locator('.discover-shortlist button').evaluateAll(es=>es.flatMap((e,i)=>{
      const b=e.getBoundingClientRect(),t=e.querySelector('.shortlist-label')!.getBoundingClientRect();
      return t.top<b.top||t.bottom>b.bottom+1||(i>0&&b.top<es[i-1].getBoundingClientRect().bottom) ? [i]:[];
    }));expect(issues).toEqual([]);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/polished-discover-${width}.png`});
  await page.goto('/methodology#score');
  const segments=await page.locator('.score-weights > span').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
  expect(segments).toHaveLength(4);
  expect(new Set(segments.map(r=>r.y)).size).toBe(1);
  for(let i=1;i<4;i++)expect(Math.abs(segments[i].x-segments[i-1].right)).toBeLessThan(1);
  const total=segments.reduce((sum,r)=>sum+r.width,0);
  for(const [i,share] of [45,25,15,15].entries())expect(100*segments[i].width/total).toBeCloseTo(share,0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/polished-method-${width}.png`});
 });
}
