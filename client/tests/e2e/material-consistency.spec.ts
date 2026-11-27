import {test,expect,Locator} from '@playwright/test';

async function appearance(control:Locator) {
  return control.evaluate(el=>{
    const s=getComputedStyle(el),r=el.getBoundingClientRect();
    return {width:r.width,height:r.height,radius:s.borderRadius,padding:s.padding,font:s.fontSize,background:s.backgroundColor,color:s.color};
  });
}
for(const width of [390,768,1440]) {
  test(`consistent Material actions, table and alignment at ${width}`,async({page})=>{
    await page.setViewportSize({width,height:1000});await page.goto('/');
    await expect(page.locator('.new-catalog.mat-mdc-table tbody tr').first()).toBeVisible();
    await expect(page.locator('.app-header nav .mat-mdc-button-base')).toHaveCount(0);
    await expect(page.locator('.app-header nav a')).toHaveCount(3);
    const card=page.locator('.recommendation:visible');
    expect(await card.evaluate(e=>getComputedStyle(e).paddingLeft)).toBe(await card.evaluate(e=>getComputedStyle(e).paddingRight));
    for(const button of await page.locator('[aria-label="Catalog views"] button').all()) {
      await expect(button).toHaveAttribute('mat-icon-button','');
      const offset=await button.evaluate(el=>{
        const b=el.getBoundingClientRect(),i=el.querySelector('mat-icon')!.getBoundingClientRect();
        return Math.max(Math.abs(b.x+b.width/2-i.x-i.width/2),Math.abs(b.y+b.height/2-i.y-i.height/2));
      });expect(offset).toBeLessThan(1);
    }
    const label=page.locator('.rail-label');
    expect(await label.evaluate(e=>{const a=e.children[0].getBoundingClientRect(),b=e.children[1].getBoundingClientRect();return b.top-a.bottom;})).toBeGreaterThanOrEqual(8);
    const variant=page.locator('.new-catalog mat-select').first();
    await variant.focus();await variant.press('Enter');
    await page.getByRole('option',{name:'Q8_0',exact:true}).click();await expect(variant).toContainText('Q8_0');
    await page.getByLabel('GPU profile (searchable)').fill('5090');
    await page.getByRole('option',{name:/NVIDIA GeForce RTX 5090/}).click();
    await expect(page.locator('.recommendation:visible')).toContainText('Fits fully in GPU memory');
    await expect(page.locator('.new-catalog')).not.toContainText('Fits fully in GPU memory');
    const arrow=await appearance(page.getByRole('button',{name:'Next recommendation'}));
    const quantButton=card.locator('.quantization-chips button[aria-pressed="false"]').first();
    const quantName=(await quantButton.textContent())!.trim();
    const quant=await appearance(quantButton);
    await page.screenshot({path:`test-results/consistent-explorer-${width}.png`});
    await page.getByRole('link',{name:'Discover',exact:true}).click();
    await expect(page.locator('.highlight-card')).toBeVisible();
    expect(await appearance(page.getByRole('button',{name:'Next highlight'}))).toEqual(arrow);
    const other=page.locator('.highlight-card .quantization-chips').getByRole('button',{name:quantName,exact:true});
    const otherStyle=await appearance(other);
    expect(Math.abs(otherStyle.width-quant.width)).toBeLessThan(1);
    expect({...otherStyle,width:0}).toEqual({...quant,width:0});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/consistent-discover-${width}.png`});
  });
}
