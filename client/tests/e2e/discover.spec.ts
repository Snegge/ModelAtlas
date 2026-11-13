import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { DISCOVER_METADATA } from "../../src/app/discover-metadata";
import { HIGHLIGHTS } from "../../src/app/discover-highlights";
for (const width of [390, 768, 1440]) {
 test("Discover navigation and shared selection at " + width, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const catalog = JSON.parse(readFileSync("../data/catalog.json", "utf8"));
  expect(new Set(HIGHLIGHTS.map(x => x.id)).size).toBe(10);
  for (const item of HIGHLIGHTS) expect(catalog.releases.some((r: {id:string}) => r.id === item.id)).toBe(true);
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/catalog") await route.fulfill({ json: catalog });
    else if (path === "/api/catalog/status") await route.fulfill({ json: {} });
    else await route.abort();
  });
  await page.goto("/");
  await page.getByRole("link", { name: "Discover", exact: true }).click();
  await expect(page.getByRole("link", {name:"Discover",exact:true})).toHaveClass("active");
  await page.reload();
  expect(await page.locator(".discover-filters").evaluate(el => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(900);
  await expect(page.locator(".highlight-card")).toHaveCount(1);
  const next = page.getByRole("button", {name:"Next highlight"});
  await expect.poll(() => next.evaluate(button => {
      const b = button.getBoundingClientRect(), icon = button.querySelector("svg")!.getBoundingClientRect();
      return Math.max(Math.abs(b.y + b.height / 2 - icon.y - icon.height / 2), Math.abs(b.x + b.width / 2 - icon.x - icon.width / 2));
    })).toBeLessThan(1);
  const seen = new Set<string>();
  for (let i=0;i<10;i++) {
    await expect(page.locator(".highlight-card [role=status]")).toHaveText((i+1)+" of 10");
    seen.add((await page.locator(".highlight-card.active h2").textContent())!);
    await expect(page.locator(".discover-shortlist button[aria-pressed=true]")).toHaveCount(1);
    await next.click();
  }
  expect(seen.size).toBe(10);
  await page.locator(".highlight-carousel").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".highlight-card [role=status]")).toHaveText("10 of 10");
  await page.keyboard.press("ArrowRight");
  await page.locator(".highlight-carousel").dispatchEvent("pointerdown", {pointerType:"touch", clientX:250, clientY:200});
  await page.locator(".highlight-carousel").dispatchEvent("pointerup", {pointerType:"touch", clientX:100, clientY:205});
  await expect(page.locator(".highlight-card [role=status]")).toHaveText("2 of 10");
  await page.emulateMedia({ reducedMotion:"reduce" });
  await page.getByRole("button", {name:"Learn more"}).click();
  await expect(page.locator("#detail-title")).toBeFocused();
  await page.locator(".discover-shortlist button").nth(3).click();
  await expect(page.locator(".highlight-card.active h2")).toHaveText(HIGHLIGHTS[3].name);
  await expect(page.locator("#detail-title")).toHaveText(HIGHLIGHTS[3].name);
  await page.locator(".discover-feature").getByRole("button", {name:"Add favourite",exact:true}).click();
  await expect(page.locator(".discover-feature").getByRole("button", {name:"Remove favourite"})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", {name:"Dismiss notification"}).click();
  const highlightName = await page.locator(".highlight-card h2").textContent();
  for (const tab of ["New Releases", "Most discussed", "Popular"]) {
    await page.getByRole("button", {name:tab,exact:true}).click();
    await expect(page.locator(".discover-shortlist button")).toHaveCount(10);
    const ranked = [...DISCOVER_METADATA.models].sort((a,b) => tab === "New Releases" ? b.createdAt.localeCompare(a.createdAt) : tab === "Popular" ? b.downloads-a.downloads : b.discussions-a.discussions);
    const expected = catalog.releases.find((r: {id:string}) => r.id === ranked[0].id);
    await expect(page.locator(".discover-shortlist button").first()).toContainText(expected.name);
    await page.locator(".discover-shortlist button").nth(1).click();
    await expect(page.locator(".highlight-card h2")).toHaveText(highlightName!);
    await expect(page.locator(".discover-feature")).toContainText(tab === "Popular" ? "downloads / 30 days" : tab === "New Releases" ? "Repository created" : "community threads");
  }
  await page.getByRole("button", {name:"Highlights",exact:true}).click();
  await expect(page.locator("#detail-title")).toHaveText(highlightName!);
  await page.screenshot({path: "test-results/discover-details-"+width+".png",fullPage:true});
  await page.evaluate(() => scrollTo(0,0));
  await page.screenshot({path: "test-results/discover-"+width+".png"});
  await page.locator(".discover-feature").getByRole("link", {name:"View model",exact:false}).click();
  await expect(page.locator(".detail-page")).toBeVisible();
  await page.screenshot({path:"test-results/model-"+width+".png"});
  await page.goto("/methodology");
  await expect(page.locator(".method-page")).toBeVisible();
  await page.screenshot({path:"test-results/method-"+width+".png"});
 });
}

