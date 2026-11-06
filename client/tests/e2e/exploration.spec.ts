import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function boot(page: Page) {
  await page.goto("/");
  await expect(page.locator(".recommendation")).toHaveCount(5);
}
async function hardware(
  page: Page,
  gpu = "NVIDIA GeForce RTX 3060 · 12 GB",
  ram = "48",
) {
  await page.getByLabel("GPU profile (searchable)").fill(gpu);
  await page.getByLabel("GPU profile (searchable)").press("Tab");
  await page.getByLabel("System RAM · GiB (0–1024)").fill(ram);
  await expect(page.locator(".recommendation").first()).toContainText("/ 100");
}
async function view(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
}
async function addFromBars(page: Page, index: number) {
  await view(page, "Bars");
  await page.locator(".score-row").nth(index).click();
  await page
    .locator(".preview")
    .getByRole("button", { name: "Compare +", exact: true })
    .click();
}

test("clean catalog views preserve search and chart comparisons", async ({
  page,
}) => {
  await boot(page);
  await expect(
    page.getByRole("region", { name: "Popular models · demo popularity" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("VRAM · GiB (0–192)", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.locator(".workspace-toolbar,.recommendation-topline,.carousel-footer"),
  ).toHaveCount(0);
  await expect(page.locator(".new-catalog th")).toHaveCount(6);
  await expect(page.locator(".new-catalog tbody button")).toHaveCount(0);
  await addFromBars(page, 0);
  await expect(page.locator(".comparison-panel article")).toHaveCount(1);
  await page.getByLabel("Search model or provider").fill("Qwen");
  for (const name of ["Tiles", "Bars", "Plot", "Table"]) {
    await view(page, name);
    await expect(page.getByLabel("Search model or provider")).toHaveValue(
      "Qwen",
    );
    if (name === "Bars" || name === "Plot")
      await expect(
        page.getByRole("heading", { name: "Compare 1/3" }),
      ).toBeVisible();
    else
      await expect(page.locator(".comparison-panel,.preview")).toHaveCount(0);
    if (name === "Tiles") {
      await expect(page.locator(".model-tile details")).toHaveCount(0);
      await expect(
        page
          .locator(".model-tile")
          .getByRole("button", { name: /Compare|Remove from comparison/ }),
      ).toHaveCount(0);
    }
  }
  await page.getByLabel("Search model or provider").fill("no-such-model");
  await expect(page.getByText("No models match your search.")).toBeVisible();
});

test("profiles, overrides and All tasks recommendations stay independent of catalog filters", async ({
  page,
}) => {
  await boot(page);
  await hardware(page);
  await expect(
    page.getByLabel("GPU memory bandwidth · GB/s (0–10000)", { exact: true }),
  ).toHaveValue("360");
  await page.getByLabel("VRAM · GiB (0–192)", { exact: true }).fill("10");
  await expect(
    page.getByText("Manual override", { exact: true }),
  ).toBeVisible();
  await hardware(page, "NVIDIA GeForce RTX 3090 · 24 GB", "128");
  await expect(
    page.getByLabel("VRAM · GiB (0–192)", { exact: true }),
  ).toHaveValue("24");
  await expect(
    page.getByLabel("GPU memory bandwidth · GB/s (0–10000)", { exact: true }),
  ).toHaveValue("936");
  const recommendations = await page
    .locator(".recommendation .summary-heading")
    .allTextContents();
  const oldScores = await page
    .locator(".new-catalog tbody tr td:nth-child(6)")
    .allTextContents();
  await page.getByRole("button", { name: "Coding", exact: true }).click();
  expect(
    await page.locator(".recommendation .summary-heading").allTextContents(),
  ).toEqual(recommendations);
  expect(
    await page
      .locator(".new-catalog tbody tr td:nth-child(6)")
      .allTextContents(),
  ).not.toEqual(oldScores);
  await page.getByLabel("Search model or provider").fill("Qwen");
  await page.getByRole("button", { name: "Parameters", exact: true }).click();
  expect(
    await page.locator(".recommendation .summary-heading").allTextContents(),
  ).toEqual(recommendations);
  await page
    .locator(".recommendation:visible")
    .getByRole("link", { name: "Details →" })
    .click();
  await expect(page.locator(".recommendation-reason")).toContainText(
    "All tasks",
  );
  await page.getByRole("button", { name: "Start simulation" }).click();
  await expect(page.locator(".chat-output")).not.toBeEmpty();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  const text = await page.locator(".chat-output").textContent();
  await page.waitForTimeout(250);
  expect(await page.locator(".chat-output").textContent()).toEqual(text);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator(".chat-output")).toBeEmpty();
  await page.getByRole("link", { name: "← Explorer", exact: true }).click();
  await expect(page.getByLabel("Search model or provider")).toHaveValue("Qwen");
});

test("comparison limit, exact variants and persistence through the chart preview", async ({
  page,
}) => {
  await boot(page);
  for (let i = 0; i < 3; i++) {
    await addFromBars(page, i);
    await expect(page.locator(".comparison-panel article")).toHaveCount(i + 1);
  }
  await addFromBars(page, 3);
  await expect(
    page.getByText("Comparison is full (3/3). Remove a variant first."),
  ).toBeVisible();
  const first = await page
    .locator(".comparison-panel article h3")
    .first()
    .textContent();
  await view(page, "Table");
  await expect(page.locator(".comparison-panel")).toHaveCount(0);
  await page.locator(".new-catalog select").first().selectOption({ index: 2 });
  await view(page, "Bars");
  expect(
    await page.locator(".comparison-panel article h3").first().textContent(),
  ).toEqual(first);
  await expect(
    page.locator(".comparison-panel article .comparison-quant").first(),
  ).toHaveText("Q4_K_M");
  await page.reload();
  await view(page, "Bars");
  await expect(page.locator(".comparison-panel article")).toHaveCount(3);
  await page
    .locator(".comparison-panel article")
    .first()
    .getByRole("button", { name: /Remove/ })
    .click();
  await expect(page.locator(".comparison-panel article")).toHaveCount(2);
});

test("CPU-only and unknown model routes are explicit", async ({ page }) => {
  await boot(page);
  await page.getByLabel("GPU profile (searchable)").fill("CPU-only");
  await page.getByLabel("GPU profile (searchable)").press("Tab");
  await page.getByLabel("System RAM · GiB (0–1024)").fill("48");
  await expect(page.locator(".recommendation")).toHaveCount(0);
  await page.goto("/models/missing");
  await expect(
    page.getByRole("heading", { name: "Model not found" }),
  ).toBeVisible();
});

test("desktop and mobile accessibility, drawer and screenshots", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await boot(page);
  await hardware(page);
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await view(page, "Plot");
  await page.getByRole("button", { name: "Compare 0/3", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Close comparison" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close comparison" }).click();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => document.activeElement !== document.body),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("offloading, context and variant changes use shared estimates", async ({
  page,
}) => {
  await boot(page);
  await hardware(page);
  await page
    .getByLabel("Search model or provider")
    .fill("Qwen2.5-14B-Instruct");
  const row = page.locator(".new-catalog tbody tr");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("outside-budget");
  await page.getByLabel("Consider CPU offloading").check();
  await expect(row).toContainText("offload");
  await expect(row.locator("td").nth(4)).toContainText("Unknown");
  await addFromBars(page, 0);
  await expect(page.locator(".comparison-panel article")).toHaveCount(1);
  await view(page, "Table");
  await row.getByLabel("Variant").selectOption({ label: "Q8_0" });
  await view(page, "Bars");
  await page.locator(".score-row").first().click();
  await expect(
    page.locator(".preview .quantization-chips button[aria-pressed=true]"),
  ).toHaveText("Q8_0");
  await page.getByText("Advanced: context & memory", { exact: true }).click();
  await page
    .getByLabel("Requested context · tokens (256–1048576)")
    .fill("4096");
  await expect(page.locator(".preview")).toContainText(
    "4,096 tokens requested",
  );
  await expect(
    page.locator(".comparison-panel article .comparison-quant"),
  ).toHaveText("Q4_K_M");
  await expect(page.locator(".comparison-panel")).toContainText(
    "4096-token context",
  );
});

test("same-task scores agree across recommendation, table and detail; plot keyboard preview", async ({
  page,
}) => {
  await boot(page);
  await hardware(page);
  const first = page.locator(".recommendation").first();
  const name = await first.locator(".summary-heading a").textContent();
  const score = await first.locator(".summary-heading strong").textContent();
  const row = page
    .locator(".new-catalog tbody tr")
    .filter({ has: page.getByRole("link", { name: name!, exact: true }) });
  await expect(row.locator("td").nth(5)).toContainText(
    score!.split("/")[0].replace("Score", "").trim(),
  );
  await view(page, "Plot");
  await page.locator(".plot-dot").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".preview")).toBeVisible();
  await first.getByRole("link", { name: "Details →" }).click();
  await expect(page.locator(".detail-page .summary-heading strong")).toHaveText(
    score!,
  );
  await page.getByRole("link", { name: "← Explorer", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Plot", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of ["Tiles", "Bars", "Plot", "Table"]) {
    await view(page, name);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("intro hierarchy, detached carousel arrows and flush comparison panel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await boot(page);
  await hardware(page);
  const form = await page.locator(".hardware-form").boundingBox(),
    card = await page.locator(".recommendations").boundingBox(),
    title = await page.locator("#intro-title").boundingBox();
  expect(form!.x + form!.width).toBeLessThan(card!.x);
  expect(title!.y + title!.height).toBeLessThan(Math.min(form!.y, card!.y));
  expect(Math.abs(form!.y - card!.y)).toBeLessThan(2);
  expect(
    await page
      .locator(".intro-grid")
      .evaluate((el) => ({
        background: getComputedStyle(el).backgroundColor,
        border: getComputedStyle(el).borderTopWidth,
      })),
  ).toEqual({ background: "rgba(0, 0, 0, 0)", border: "0px" });
  await expect(
    page.getByRole("button", { name: "Previous recommendation" }),
  ).not.toBeVisible();
  for (let i = 1; i <= 5; i++) {
    await expect(page.locator(".recommendation:visible")).toHaveAttribute(
      "aria-label",
      `Recommendation ${i} of 5`,
    );
    const box = await page.locator(".recommendation:visible").boundingBox(),
      next = await page.locator(".carousel-next").boundingBox();
    expect(next!.x - box!.x - box!.width).toBeGreaterThanOrEqual(8);
    if (i > 1) {
      await expect(
        page.getByRole("button", { name: "Previous recommendation" }),
      ).toBeVisible();
      const prev = await page.locator(".carousel-previous").boundingBox();
      expect(box!.x - prev!.x - prev!.width).toBeGreaterThanOrEqual(8);
    }
    await page.getByRole("button", { name: "Next recommendation" }).click();
  }
  await page.locator(".carousel-next").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".recommendation:visible")).toHaveAttribute(
    "aria-label",
    "Recommendation 2 of 5",
  );
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".recommendation:visible")).toHaveAttribute(
    "aria-label",
    "Recommendation 1 of 5",
  );
  await view(page, "Bars");
  expect(
    await page
      .locator(".comparison-panel")
      .evaluate((el) => getComputedStyle(el).marginTop),
  ).toBe("0px");
  const catalog = await page.locator(".catalog-workspace").boundingBox(),
    panel = await page.locator(".comparison-panel").boundingBox();
  expect(Math.abs(catalog!.y - panel!.y)).toBeLessThan(2);
});

test("bar detail rail, plot preview and compact tiles", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await boot(page);
  await hardware(page);
  await addFromBars(page, 0);
  await addFromBars(page, 1);
  await page.locator(".score-row").first().click();
  await expect(page.locator(".mini-benchmarks")).toBeVisible();
  const bars = await page.locator(".score-bars").boundingBox(),
    preview = await page.locator(".preview").boundingBox();
  expect(preview!.x).toBeGreaterThan(bars!.x + bars!.width);
  await page.screenshot({
    path: "test-results/wireframe-bars.png",
    fullPage: true,
  });
  await view(page, "Plot");
  await page.locator(".plot-dot").first().click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.querySelector(".preview")!.getBoundingClientRect().top -
          document.querySelector(".speed-plot")!.getBoundingClientRect().bottom,
      ),
    )
    .toBeGreaterThan(0);
  await page.screenshot({
    path: "test-results/wireframe-plot.png",
    fullPage: true,
  });
  await view(page, "Tiles");
  await expect(
    page.locator(".model-tile").first().locator(".quantization-chips"),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/wireframe-tiles.png",
    fullPage: true,
  });
});
