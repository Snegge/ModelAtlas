import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [390, 768, 1440]) {
  test(`shared visual contract at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator(".new-catalog tbody tr").first()).toBeVisible();
    const modelUrl = await page.locator(".new-catalog tbody tr").first().getByRole("link").first().getAttribute("href");
    for (const [route, panel, primary] of [
      ["/", ".surface", ".details-link"],
      ["/discover", ".highlight-card", ".discover-primary"],
      [modelUrl!, ".surface", ""],
      ["/methodology", ".method-content", ""],
    ]) {
      await page.goto(route);
      await expect(page.locator(panel).first()).toBeVisible();
      const actual = await page.locator(panel).first().evaluate(el => {
        const root = getComputedStyle(document.documentElement);
        const style = getComputedStyle(el);
        return { radius: style.borderRadius, expectedRadius: root.getPropertyValue("--radius-panel").trim(), overflow: document.documentElement.scrollWidth > innerWidth };
      });
      expect(actual.radius).toBe(actual.expectedRadius);
      expect(actual.overflow).toBe(false);
      if (primary) {
        const link = page.locator(primary).first();
        await expect(link).toHaveCSS("background-color", "rgb(37, 99, 235)");
        await link.hover();
        await expect(link).toHaveCSS("background-color", "rgb(29, 78, 216)");
        await page.keyboard.press("Tab");
        await link.focus();
        await expect(link).toHaveCSS("outline-style", "solid");
        await expect(link).toHaveCSS("outline-width", "3px");
      }
      expect((await new AxeBuilder({ page }).analyze()).violations.map(v => ({
        id: v.id, nodes: v.nodes.map(n => ({ target: n.target, reason: n.failureSummary })),
      }))).toEqual([]);
      await page.screenshot({ path: `test-results/style-${route === "/" ? "explorer" : route.split("/")[1]}-${width}.png`, fullPage: true });
    }
  });
}
