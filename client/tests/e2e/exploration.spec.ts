import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function boot(page: any) {
  await page.goto("/");
  await expect(page.locator(".recommendation")).toHaveCount(5);
}
async function hardware(
  page: any,
  gpu = "NVIDIA GeForce RTX 3060 · 12 GB",
  ram = "48",
) {
  await page.getByLabel("GPU profile (searchable)").fill(gpu);
  await page.getByLabel("GPU profile (searchable)").press("Tab");
  await page.getByLabel("System RAM · GiB (0–1024)").fill(ram);
  await expect(page.locator(".recommendation").first()).toContainText("/100");
}
test("empty hardware and demo popular models, search and all four views", async ({
  page,
}) => {
  await boot(page);
  await expect(
    page.getByRole("heading", { name: "Popular models", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("VRAM · GiB (0–192)", { exact: true }),
  ).toHaveValue("");
  await page
    .getByRole("button", { name: "Compare +", exact: true })
    .last()
    .click();
  await page.getByLabel("Search model or provider").fill("Qwen");
  for (const view of ["Tiles", "Bars", "Plot", "Table"]) {
    await page.getByRole("button", { name: view, exact: true }).click();
    await expect(page.getByLabel("Search model or provider")).toHaveValue(
      "Qwen",
    );
    await expect(
      page.getByRole("heading", { name: "Compare 1/3" }),
    ).toBeVisible();
  }
  await page.getByLabel("Search model or provider").fill("no-such-model");
  await expect(page.getByText("No models match your search.")).toBeVisible();
});
test("profiles, manual overrides, ranking invariance and direct detail simulation", async ({
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
  const names = await page.locator(".recommendation summary").allTextContents();
  await page.getByLabel("Search model or provider").fill("Qwen");
  await page.getByRole("button", { name: "Parameters", exact: true }).click();
  expect(
    await page.locator(".recommendation summary").allTextContents(),
  ).toEqual(names);
  await page
    .locator(".recommendation")
    .first()
    .getByRole("link", { name: "Details →" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Why this model is recommended" }),
  ).toBeVisible();
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
test("comparison limit, exact variants and persistence", async ({ page }) => {
  await boot(page);
  const buttons = page
    .locator(".new-catalog")
    .getByRole("button", { name: "Compare +", exact: true });
  for (let i = 1; i <= 3; i++) {
    await buttons.nth(0).click();
    await expect(page.locator(".comparison-panel article")).toHaveCount(i);
  }
  await buttons.nth(0).click();
  await expect(
    page.getByText("Comparison is full (3/3). Remove a variant first."),
  ).toBeVisible();
  const first = await page
    .locator(".comparison-panel article h3")
    .first()
    .textContent();
  await page.locator(".new-catalog select").first().selectOption({ index: 2 });
  expect(
    await page.locator(".comparison-panel article h3").first().textContent(),
  ).toEqual(first);
  await page.reload();
  await expect(page.locator(".comparison-panel article")).toHaveCount(3);
  await page
    .locator(".comparison-panel article")
    .first()
    .getByRole("button", { name: /Remove/ })
    .click();
  await expect(page.locator(".comparison-panel article")).toHaveCount(2);
});
test("CPU-only and unknown route are explicit", async ({ page }) => {
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
test("desktop and mobile accessibility and screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await boot(page);
  await hardware(page);
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  let scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Compare 0/3", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Close comparison" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close comparison" }).click();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => document.activeElement !== document.body),
  ).toBe(true);
  scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations).toEqual([]);
});

test("offloading, context and variant changes share the same estimates", async ({
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
  await row.getByRole("button", { name: "Compare +", exact: true }).click();
  await expect(page.locator(".comparison-panel article")).toHaveCount(1);
  await row.getByLabel("Variant").selectOption({ label: "Q8_0" });
  await expect(page.locator(".comparison-panel article h3")).toContainText(
    "Q4_K_M",
  );
  await row.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.locator(".preview")).toContainText("Q8_0");
  await page.getByText("Advanced: context & memory", { exact: true }).click();
  await page
    .getByLabel("Requested context · tokens (256–1048576)")
    .fill("4096");
  await expect(page.locator(".preview")).toContainText(
    "4,096 tokens requested",
  );
  await expect(page.locator(".comparison-panel")).toContainText(
    "4096-token context",
  );
  await page.getByRole("button", { name: "Coding", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Task", exact: true })).toHaveValue("Coding");
});

test("recommendation score agrees with table and detail; plot keyboard preview", async ({
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
    score!.split("/")[0].trim(),
  );
  await page.getByRole("button", { name: "Plot", exact: true }).click();
  const dot = page.locator(".plot-dot").first();
  await dot.focus();
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
  for (const view of ["Tiles", "Bars", "Plot", "Table"]) {
    await page.getByRole("button", { name: view, exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
