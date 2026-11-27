import { test, expect } from '@playwright/test';
for (const width of [390,768,1440]) {
  test(`expanded catalog, GPU selection, filters and page scrolling at ${width}`,async({page,request})=>{
    await page.setViewportSize({width,height:1000});
    const catalog=await (await request.get('/api/catalog')).json();
    expect(catalog.releases.length).toBeGreaterThan(29);
    for(const r of catalog.releases) {
      expect(r.qualityRating.score).toBeGreaterThanOrEqual(0);expect(r.qualityRating.score).toBeLessThanOrEqual(100);
      expect(r.qualityRating.sourceUrl).toMatch(/^https:/);expect(r.tasks.length).toBeGreaterThan(0);
      if(r.referenceQuality) {
        expect(r.referenceQuality.values).toHaveLength(2);
        expect(r.referenceQuality.score).toBeCloseTo(50*r.referenceQuality.values.reduce((a:number,b:number)=>a+b,0));
      }
      expect(catalog.artifacts.some((a:{releaseId:string})=>a.releaseId===r.id)).toBe(true);
    }
    await page.goto('/');await expect(page.locator('.new-catalog tbody tr')).toHaveCount(catalog.releases.length);
    await expect(page.getByLabel(/CPU \(|Consider CPU|Minimum generation speed|GPU memory bandwidth|^VRAM/)).toHaveCount(0);
    const gpu=page.getByLabel('GPU profile (searchable)'); await gpu.fill('5090');
    await expect(page.locator('mat-option')).toHaveCount(1);await gpu.press('ArrowDown');await gpu.press('Enter');
    await expect(page.locator('.hardware-specs')).toContainText('32 GiB');await expect(page.locator('.hardware-specs')).toContainText('1792 GB/s');
    await expect(page.locator('.recommendation').first()).toContainText('Quality input');
    await expect(page.locator('.new-catalog tbody tr').first().locator('td').nth(2)).toContainText('Requested: 8K');
    await expect(page.getByRole('progressbar',{name:'GPU VRAM usage'}).first()).toHaveAttribute('aria-valuenow',/\d+/);
    for(const task of ['Chat','Coding','Reasoning','Agentic']) {
      await page.getByRole('button',{name:task,exact:true}).click();
      const expected=catalog.releases.filter((r:{tasks:string[]})=>r.tasks.includes(task));
      await expect(page.locator('.new-catalog tbody tr')).toHaveCount(expected.length);expect(expected.length).toBeGreaterThan(0);
    }
    await page.getByRole('button',{name:'All tasks',exact:true}).click();
    expect(await page.locator('.table-scroll').evaluate(el=>getComputedStyle(el).overflow)).toBe('visible');
    await page.evaluate(()=>window.scrollTo(0,2000));expect((await page.locator('.app-header').boundingBox())!.y).toBe(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/catalog-${width}.png`});
    await page.locator('.new-catalog tbody tr').filter({hasText:'Qwen3-8B'}).getByRole('link').first().click();
    await expect(page.locator('#model-evidence')).toContainText('Attributed editorial rating');
    await expect(page.getByRole('link',{name:'Quality source',exact:true})).toHaveAttribute('href',/willitrunai.com/);
    await expect(page.locator('#model-evidence .quality-table')).toHaveCount(0);
  });
}
