import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
for (const width of [390, 768, 1440]) {
  test("vertical favourites rail and local sidebar at " + width, async ({ page }) => {
    const catalog = JSON.parse(readFileSync("../data/catalog.json", "utf8"));
    await page.setViewportSize({ width, height: 1000 });
    await page.route("**/api/**", route => {
      const path = new URL(route.request().url()).pathname;
      return path === "/api/catalog" ? route.fulfill({ json: catalog }) :
        path === "/api/catalog/status" ? route.fulfill({ json: {} }) : route.abort();
    });
    await page.goto("/");
    const buttons = page.locator(".new-catalog tbody atlas-favourite-button button");
    await expect(buttons).toHaveCount(catalog.releases.length);
    await expect(page.locator(".new-catalog th").last()).toHaveText("Actions");
    await expect(page.locator(".new-catalog tbody tr").first().locator("td").last().locator("atlas-favourite-button")).toHaveCount(1);
    await expect(page.locator(".new-catalog tbody tr").first().locator("td").first().locator("atlas-favourite-button")).toHaveCount(0);
    const arrow = page.getByRole("button", {name:"Next recommendation"});
    await expect.poll(() => arrow.evaluate(button => {
      const b = button.getBoundingClientRect(), icon = button.querySelector("svg")!.getBoundingClientRect();
      return Math.max(Math.abs(b.y + b.height / 2 - icon.y - icon.height / 2), Math.abs(b.x + b.width / 2 - icon.x - icon.width / 2));
    })).toBeLessThan(1);
    await expect(buttons.first()).toHaveAttribute("aria-pressed", "false");
    for (let i = 0; i < 6; i++) await buttons.nth(i).click();
    await expect(buttons.first().locator("svg")).toHaveAttribute("fill", "currentColor");
    await page.reload();
    const trigger = page.locator(".catalog-favourites-trigger");
    const panel = page.locator(".favourites-panel");
    const workspace = page.locator(".catalog-workspace");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(panel).not.toBeVisible();
    const closedWidth = (await workspace.boundingBox())!.width;
    const layoutWidth = (await page.locator(".catalog-layout").boundingBox())!.width;
    expect(Math.abs(layoutWidth - closedWidth - 56)).toBeLessThan(2);
    await expect(page.locator(".app-header").getByText("Favourites")).toHaveCount(0);
    await expect(page.locator(".view-toolbar .catalog-favourites-trigger")).toHaveCount(0);
    for (const view of ["Tiles", "Bars", "Plot", "Table"]) {
      await page.getByRole("button", { name: view, exact: true }).click();
      await trigger.scrollIntoViewIfNeeded();
      const closedTrigger = (await trigger.boundingBox())!;
      await trigger.click();
      await expect(panel).toBeVisible();
      await expect(panel.locator("article")).toHaveCount(6);
      await expect.poll(async () => Math.round((await page.locator(".favourites-slide").boundingBox())!.width)).toBe(width > 1100 ? 380 : width > 800 ? 320 : Math.min(380, width - 100));
      const openTrigger = (await trigger.boundingBox())!;
      expect(Math.abs(openTrigger.x - closedTrigger.x)).toBeLessThan(1);
      expect(Math.abs(openTrigger.y - closedTrigger.y)).toBeLessThan(1);
      const slide = (await page.locator(".favourites-slide").boundingBox())!;
      expect(Math.abs(slide.x + slide.width - openTrigger.x)).toBeLessThan(1);
      const openWidth = (await workspace.boundingBox())!.width;
      if (width > 800) expect(openWidth).toBeLessThan(closedWidth - 300);
      else expect(Math.abs(openWidth - closedWidth)).toBeLessThan(2);
      await trigger.click();
      await expect(panel).not.toBeVisible();
      await expect(trigger).toBeFocused();
      await expect.poll(async () => Math.abs((await workspace.boundingBox())!.width - closedWidth)).toBeLessThan(2);
    }
    await trigger.click();
    await expect(panel.locator("article.model-tile atlas-summary")).toHaveCount(6);
    await expect(panel.locator(".saved-variant").first()).toContainText("Q4_K_M");
    await panel.locator("article atlas-favourite-button button").first().click();
    await expect(panel.locator("article")).toHaveCount(5);
    await expect(panel.locator("article atlas-favourite-button button").first()).toBeFocused();
    await expect(panel.locator(".card-memory").first()).toBeVisible();
    await page.getByRole("button", { name: "Dismiss notification" }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).include(".favourites-panel").analyze()).violations).toEqual([]);
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({ path: "test-results/favourites-" + width + ".png" });
    await trigger.click();
    await expect.poll(async () => (await page.locator(".favourites-slide").boundingBox())!.width).toBe(0);
    await expect(panel.locator(".card-memory").first()).not.toBeVisible();
    await page.screenshot({ path: "test-results/favourites-collapsed-" + width + ".png" });
    await page.goto("/discover");
    await page.getByRole("link", {name:"View favourites"}).click();
    await expect(page).toHaveURL(/\/#model-catalog$/);
    await expect(panel).toBeVisible();
    await panel.getByRole("link", {name:"Details"}).first().click();
    await expect(page.locator(".detail-page")).toBeVisible();
  });
}

