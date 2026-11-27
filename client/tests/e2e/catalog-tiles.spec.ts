import {test,expect,Page} from '@playwright/test';

async function equalHeights(page:Page) {
  const heights=await page.locator('.tile-grid .model-tile').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
  expect(heights.length).toBeGreaterThan(1);
  expect(Math.max(...heights)-Math.min(...heights)).toBeLessThan(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
}

for(const width of [390,768,1440]) {
  test(`catalog tiles stay equal with short and long descriptions at ${width}`,async({page})=>{
    await page.setViewportSize({width,height:1000});await page.goto('/');
    await page.getByRole('button',{name:'Tiles',exact:true}).click();
    const grid=page.locator('.tile-grid');
    await expect(grid.locator('.model-tile').first()).toBeVisible();
    await equalHeights(page);
    await page.getByLabel('GPU profile (searchable)').fill('5090');
    await page.getByRole('option',{name:/NVIDIA GeForce RTX 5090/}).click();
    await page.getByLabel('System RAM · GiB',{exact:true}).fill('64');
    await expect(page.locator('.recommendation:visible')).toContainText('Fits fully in GPU memory');
    await expect(grid.locator('.card-metrics').first()).not.toContainText('Calculating');
    await expect(grid.locator('.fit-label')).toHaveCount(0);
    await expect(grid.getByText('RAM planning hint:',{exact:false})).toHaveCount(0);
    await equalHeights(page);
    const before=await grid.locator('.model-tile').first().evaluate(e=>e.getBoundingClientRect().height);
    const descriptions=grid.locator('.card-description');
    await descriptions.nth(0).evaluate(e=>e.textContent='Short');
    await descriptions.nth(1).evaluate(e=>e.textContent='A much longer model description with extra details. '.repeat(40));
    await equalHeights(page);
    expect(await grid.locator('.model-tile').first().evaluate(e=>e.getBoundingClientRect().height)).toBe(before);
    await grid.locator('.model-tile').first().scrollIntoViewIfNeeded();
    await page.screenshot({path:`test-results/catalog-tiles-${width}.png`});
    await grid.locator('.model-tile').first().getByRole('link',{name:'Details',exact:true}).click();
    await expect(page).toHaveURL(/\/models\//);
    await expect(page.locator('.fit-label').first()).toBeVisible();
  });
}
