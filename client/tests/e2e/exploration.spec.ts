import { test, expect, Page } from "@playwright/test";
import fs from "node:fs";

const browserErrors = new WeakMap<Page, string[]>();

async function open(page: Page) {
  await page.goto("/");
  await expect(page.locator(".loading-state")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeEnabled();
}
async function settled(page: Page) {
  await expect(page.locator(".chart-updating")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeEnabled();
}
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await settled(page);
});
test.afterEach(async ({ page }, result) => {
  const errors = browserErrors.get(page) ?? [];
  if (
    process.env["CI"] &&
    (result.status !== result.expectedStatus || errors.length)
  ) {
    const message = [
      ...result.errors.map((error) => error.message ?? "Browser test failed"),
      ...errors,
    ]
      .join("\n")
      .replaceAll("%", "%25")
      .replaceAll("\r", "%0D")
      .replaceAll("\n", "%0A");
    console.log(
      `::error title=Browser test failed::${result.title}: ${message}`,
    );
  }
  expect(errors, "Browser console and runtime errors").toEqual([]);
});

test("desktop linked views, exact artifact selection and visible provenance", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const row = page.locator("tbody tr").nth(2);
  const id = await row.getAttribute("data-release");
  const model = await row.locator(".model-select").innerText();
  await row.locator(".model-select").focus();
  await expect(page.locator("#detail-heading")).toHaveText(model);
  await expect(row).toHaveClass(/selected-row/);
  const variants = page.locator("#detail-artifact option");
  expect(await variants.count()).toBeGreaterThan(1);
  const last = await variants.last().getAttribute("value");
  await page.locator("#detail-artifact").selectOption(last!);
  await expect(page.locator('tr[data-release="' + id + '"]')).toHaveClass(
    /selected-row/,
  );
  await page
    .getByRole("button", { name: "Compare this exact artifact" })
    .click();
  await expect(page.locator(".comparison-item")).toHaveCount(1);
  await expect(page.locator("atlas-detail .button.primary")).toBeFocused();
  await page
    .getByText("Provenance & complete file set", { exact: true })
    .click();
  await expect(page.locator(".provenance").first()).toContainText(
    "Artifact revision",
  );
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("compact workspace preserves context range, unclipped labels and visible comparison", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.locator(".workspace-intro, .overview-counts, #preset"),
  ).toHaveCount(0);
  await expect(
    page.locator("atlas-chart + atlas-comparison + atlas-catalog"),
  ).toHaveCount(1);
  const chartState = () =>
    page.evaluate(() => {
      // Inspect the rendered canvas chart in the development build, rather than
      // duplicating its scale calculations in the test.
      const component = (window as any).ng.getComponent(
        document.querySelector("atlas-chart"),
      );
      const chart = component.chart;
      const options = chart.getOption();
      const labels = chart
        .getZr()
        .storage.getDisplayList()
        .filter(
          (element: any) =>
            element.style?.text === "DeepSeek-R1-Distill-Llama-8B",
        )
        .map((element: any) => {
          const box = element.getBoundingRect().clone();
          if (element.transform) box.applyTransform(element.transform);
          return { x: box.x, y: box.y, width: box.width, height: box.height };
        });
      return {
        min: options.yAxis[0].min,
        max: options.yAxis[0].max,
        boundaryLabels: options.series
          .filter((series: any) => series.markLine)
          .map((series: any) => series.markLine.label.show),
        labels,
        width: chart.getWidth(),
        height: chart.getHeight(),
      };
    });
  const initial = await chartState();
  expect(initial.min).toBe(8192);
  expect(initial.max).toBe(131072);
  expect(initial.boundaryLabels.every((shown: boolean) => !shown)).toBe(true);
  await page.locator("#search").fill("DeepSeek-R1-Distill-Llama-8B");
  await page.locator("tbody .model-select").click();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    // Canvas resize and label layout settle on a later animation frame.
    await expect
      .poll(async () => {
        const state = await chartState();
        const label = state.labels[0];
        const surfaceWidth = await page
          .locator(".scatter-surface")
          .evaluate((element) => element.clientWidth);
        return (
          state.width === surfaceWidth &&
          state.labels.length === 1 &&
          label.x >= 0 &&
          label.y >= 0 &&
          label.x + label.width <= state.width &&
          label.y + label.height <= state.height
        );
      })
      .toBe(true);
    const state = await chartState();
    expect(state.min).toBe(initial.min);
    expect(state.max).toBe(initial.max);
    const label = state.labels[0];
    expect(label.x).toBeGreaterThanOrEqual(0);
    expect(label.y).toBeGreaterThanOrEqual(0);
    expect(label.x + label.width).toBeLessThanOrEqual(state.width);
    expect(label.y + label.height).toBeLessThanOrEqual(state.height);
  }
  await page.locator("#context-exact").fill("4096");
  await settled(page);
  await expect(page.locator(".chart-threshold-note")).toContainText(
    "Below plotted range",
  );
  await page.locator("#context-exact").fill("1048576");
  await settled(page);
  await expect(page.locator(".chart-threshold-note")).toContainText(
    "Above all model limits",
  );
  const final = await chartState();
  expect(final.min).toBe(initial.min);
  expect(final.max).toBe(initial.max);
  await page
    .getByRole("button", { name: "Compare this exact artifact" })
    .click();
  await expect(page.locator("atlas-detail .button.primary")).toBeFocused();
});

test("desktop comparison stays fully visible with three artifacts and a baseline without moving the page", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator(".comparison-panel")).toBeInViewport({ ratio: 1 });
  await expect(page.locator(".chart-info-content")).toBeHidden();
  await expect(
    page.locator(".chart-caption, .chart-reading, .chart-limit"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Pin as baseline" }).click();
  await settled(page);
  await expect(page.locator("atlas-hardware .baseline-strip")).toHaveCount(1);
  const artifacts = await page
    .locator("#detail-artifact option")
    .evaluateAll((options) =>
      options.slice(0, 3).map((option) => (option as HTMLOptionElement).value),
    );
  expect(artifacts).toHaveLength(3);
  await page.evaluate(() => window.scrollTo(0, 0));
  for (let index = 0; index < artifacts.length; index++) {
    await page.locator("#detail-artifact").selectOption(artifacts[index]);
    const button = page.getByRole("button", {
      name: "Compare this exact artifact",
    });
    await button.focus();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    if (index === 0) await button.click();
    else await button.press("Enter");
    await expect(page.locator(".comparison-item")).toHaveCount(index + 1);
    await expect(page.locator("atlas-detail .button.primary")).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  }
  let releaseCatalog!: () => void;
  const catalogReady = new Promise<void>((resolve) => {
    releaseCatalog = resolve;
  });
  await page.route("**/api/catalog", async (route) => {
    await catalogReady;
    await route.continue();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  try {
    await expect(page.locator(".comparison-empty")).toHaveText(
      "Loading saved artifacts…",
    );
  } finally {
    releaseCatalog();
  }
  await settled(page);
  await page.unroute("**/api/catalog");
  await expect(page.locator(".comparison-item")).toHaveCount(3);
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator(".comparison-panel")).toBeInViewport({
      ratio: 1,
    });
    const panel = (await page.locator(".comparison-panel").boundingBox())!;
    expect(panel.y + panel.height).toBeLessThanOrEqual(viewport.height);
    for (const bar of await page
      .locator(".comparison-item .memory-track")
      .all()) {
      await expect(bar).toBeInViewport({ ratio: 1 });
    }
  }
  await page.locator(".chart-info summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".chart-info-content")).toContainText(
    "37 of 38 matching releases plotted",
  );
  await expect(page.locator(".chart-info-content")).toContainText(
    "no usable estimate",
  );
  await page.keyboard.press("Enter");
  await expect(page.locator(".chart-info-content")).toBeHidden();
  await page.locator(".comparison-more summary").first().click();
  await expect(
    page.locator(".comparison-more[open] .memory-legend"),
  ).toContainText("KV cache");
  await expect(page.locator(".comparison-more[open] a")).toHaveAttribute(
    "href",
    /^https:\/\/huggingface\.co\//,
  );
});

test("baseline remains pinned, restoration and reset work and persist", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Pin as baseline" }).click();
  await settled(page);
  await page.locator("#context-exact").fill("16384");
  await page.locator("#gpu-exact").fill("24");
  await settled(page);
  await expect(page.locator(".baseline-values")).toContainText("12 GiB GPU");
  await expect(
    page.getByRole("button", { name: "Pin as baseline" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Replace pinned baseline" }),
  ).toHaveCount(0);
  await expect(page.locator(".baseline-values")).toContainText("8,192 tokens");
  await expect(page.locator("atlas-detail .memory-row")).toHaveCount(2);
  const exactArtifact = await page.locator("#detail-artifact").inputValue();
  await page.locator("#quant-preference").selectOption("Q8_0");
  await settled(page);
  await expect(page.locator("tbody .variant-change").first()).toContainText(
    "Was Q4_K_M",
  );
  await expect(page.locator("#detail-artifact")).toHaveValue(exactArtifact);
  await page.reload();
  await settled(page);
  await expect(page.locator("#gpu-exact")).toHaveValue("24");
  await expect(page.locator(".baseline-values")).toContainText("12 GiB GPU");
  await page.getByRole("button", { name: "Restore baseline" }).click();
  await settled(page);
  await expect(page.locator("#gpu-exact")).toHaveValue("12");
  await expect(page.locator("#context-exact")).toHaveValue("8192");
  await page
    .getByRole("button", { name: "Clear baseline", exact: true })
    .click();
  await settled(page);
  await expect(page.locator(".baseline-strip")).toHaveCount(0);
  await page.locator("#gpu-exact").fill("6");
  await page
    .getByRole("button", { name: "Reset exploration to defaults" })
    .click();
  await settled(page);
  await expect(page.locator("#gpu-exact")).toHaveValue("12");
  await expect(page.locator("#context-exact")).toHaveValue("8192");
});

test("comparison limit never replaces a selection, filters retain exact choices, empty search recovers", async ({
  page,
}) => {
  const buttons = page.locator("tbody .compare-toggle");
  for (let i = 0; i < 3; i++) await buttons.nth(i).click();
  const before = await page
    .locator(".comparison-title .model-select")
    .allTextContents();
  await buttons.nth(3).click();
  await expect(page.locator(".notice-banner")).toContainText("Remove one");
  await expect(page.locator(".comparison-item")).toHaveCount(3);
  expect(
    await page.locator(".comparison-title .model-select").allTextContents(),
  ).toEqual(before);
  await page.locator("#search").fill("no-such-model-987");
  await expect(page.locator(".empty-state")).toContainText(
    "No matching releases",
  );
  await expect(page.locator(".comparison-item")).toHaveCount(3);
  await expect(page.locator(".comparison-item .outside-filter")).toHaveCount(3);
  await expect(page.locator("atlas-detail .outside-filter")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(12);
  await page.locator(".comparison-item .remove-button").first().click();
  await buttons.nth(3).click();
  await expect(page.locator(".comparison-item")).toHaveCount(3);
});

test("export matches canonical displayed settings and estimates", async ({
  page,
}) => {
  await page.locator("#gpu-exact").fill("24");
  await page.locator("#context-exact").fill("4096");
  await settled(page);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloaded;
  const text = fs
    .readFileSync((await download.path())!, "utf8")
    .replace(/^\uFEFF/, "");
  const lines = text.split("\r\n");
  const parse = (line: string) =>
    [...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map((m) =>
      m[1].replaceAll('""', '"'),
    );
  const headers = parse(lines[0]),
    first = parse(lines[1]);
  const value = (key: string) => first[headers.indexOf(key)];
  expect(value("GPU_budget_GiB")).toBe("24");
  expect(value("requested_context_tokens")).toBe("4096");
  expect(value("artifact_revision")).toMatch(/^[a-f0-9]{40}$/);
  expect(value("artifact_source")).toContain("https://huggingface.co/");
  const api = await page.request.post("/api/evaluate", {
    data: {
      settings: {
        gpuGiB: 24,
        ramGiB: 32,
        contextTokens: 4096,
        quantization: "Q4_K_M",
        allowOffload: true,
        cachePrecision: "f16",
        concurrency: 1,
      },
      baseline: null,
    },
  });
  const evalData = await api.json();
  const expected = evalData.artifacts.find(
    (x: any) => x.artifactId === value("artifact_id"),
  );
  expect(Number(value("estimated_total_GiB"))).toBe(expected.scenario.totalGiB);
});

test("obsolete responses do not overwrite newer hardware", async ({ page }) => {
  let observed = false;
  await page.route("**/api/evaluate", async (route) => {
    const data = route.request().postDataJSON();
    if (data.settings.contextTokens === 4096) {
      observed = true;
      await new Promise((r) => setTimeout(r, 900));
    }
    try {
      await route.continue();
    } catch {
      /* canceled requests are expected */
    }
  });
  await page.locator("#context-exact").fill("4096");
  await expect.poll(() => observed).toBe(true);
  await page.locator("#context-exact").fill("16384");
  await settled(page);
  await page.waitForTimeout(1100);
  await expect(page.locator("#context-exact")).toHaveValue("16384");
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("model-atlas.session.v1")!).hardware,
  );
  expect(saved.contextTokens).toBe(16384);
  await expect(page.locator(".chart-updating")).toHaveCount(0);
});

test("search, family, artifact availability, fits, sorting, custom hardware and advanced settings work", async ({
  page,
}) => {
  await page.locator("#gpu-exact").fill("24");
  await page.locator("#ram-exact").fill("64");
  await settled(page);
  await expect(page.locator("#gpu-exact")).toHaveValue("24");
  await page.locator("#family-filter").selectOption("Qwen");
  await expect(page.locator("tbody")).toContainText("Qwen");
  await page.locator("#quant-filter").selectOption("Q8_0");
  await page.getByLabel("Estimated GPU fits only", { exact: true }).check();
  await expect(page.locator("tbody .status-label").first()).toHaveText(
    /Estimated GPU fit/,
  );
  await page.locator("#sort").selectOption("context");
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Advanced inference settings" })
    .click();
  await page.locator("#cache").selectOption("f32");
  await page.locator("#concurrency").fill("2");
  await settled(page);
  await page
    .getByLabel("Allow partial CPU/RAM offloading", { exact: true })
    .uncheck();
  await settled(page);
  await page.getByRole("button", { name: "Enable chart zoom" }).click();
  await expect(
    page.getByRole("button", { name: "Reset & exit zoom" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Reset & exit zoom" }).click();
  await page.getByRole("link", { name: "Method & data" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Useful estimates. Visible uncertainty.",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Return to the explorer" }).click();
  await expect(page.locator("#gpu-exact")).toHaveValue("24");
});

test("narrow viewport stays within the screen and supports the complete flow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.locator("#gpu-exact").fill("6");
  await page.locator("#ram-exact").fill("16");
  await settled(page);
  await page.getByRole("button", { name: "Pin as baseline" }).click();
  await settled(page);
  await page.locator("#context-exact").fill("4096");
  await settled(page);
  await page.locator("tbody .model-select").first().click();
  await page
    .getByRole("button", { name: "Compare this exact artifact" })
    .click();
  await expect(page.locator(".comparison-item")).toHaveCount(1);
  await expect(page.locator("atlas-detail .button.primary")).toBeFocused();
  const width = await page.evaluate(() => ({
    body: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(width.body).toBeLessThanOrEqual(width.viewport);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("API supports queries, details, unknowns and input validation", async ({
  request,
}) => {
  const catalog = await (await request.get("/api/catalog")).json();
  expect(catalog.releases.length).toBeGreaterThanOrEqual(20);
  const filtered = await (
    await request.get(
      "/api/catalog?search=Qwen&family=Qwen&quantization=Q4_K_M",
    )
  ).json();
  expect(filtered.releases.length).toBeGreaterThan(0);
  expect(filtered.releases.every((r: any) => r.family === "Qwen")).toBe(true);
  expect(
    (await request.get("/api/models/" + catalog.releases[0].id)).status(),
  ).toBe(200);
  expect(
    (await request.get("/api/artifacts/" + catalog.artifacts[0].id)).status(),
  ).toBe(200);
  expect((await request.get("/api/models/absent")).status()).toBe(404);
  expect(
    (
      await request.post("/api/evaluate", {
        data: { settings: { gpuGiB: -2 }, baseline: null },
      })
    ).status(),
  ).toBe(400);
  const result = await (
    await request.post("/api/evaluate", {
      data: {
        settings: {
          gpuGiB: 12,
          ramGiB: 32,
          contextTokens: 8192,
          quantization: "Q4_K_M",
          allowOffload: true,
          cachePrecision: "f16",
          concurrency: 1,
        },
        baseline: null,
      },
    })
  ).json();
  expect(result.releases.length).toBe(catalog.releases.length);
  expect(result.artifacts.length).toBe(catalog.artifacts.length);
  expect(
    result.releases.some((p: any) => p.scenario.status === "unknown"),
  ).toBe(true);
  expect(
    (
      await request.post("/api/evaluate", {
        data: { settings: null, baseline: null },
      })
    ).status(),
  ).toBe(400);
});

test("accessibility scan on desktop and narrow viewport", async ({ page }) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
});

test("keyboard plot navigation synchronizes catalog and details", async ({
  page,
}) => {
  const original = await page.locator("#detail-heading").innerText();
  await page.locator(".scatter-surface").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#detail-heading")).not.toHaveText(original);
  await expect(page.locator("tbody tr.selected-row")).toHaveCount(1);
  await page.keyboard.press("Escape");
});

test("unknown MoE record remains inspectable and accessible with baseline and comparison", async ({
  page,
}) => {
  await page.locator("#search").fill("Qwen3-30B-A3B");
  await page.locator("tbody .model-select").click();
  await expect(page.locator("atlas-detail .detail-status")).toContainText(
    "Insufficient information",
  );
  await page
    .getByRole("button", { name: "Compare this exact artifact" })
    .click();
  await page.getByRole("button", { name: "Pin as baseline" }).click();
  await settled(page);
  await page
    .getByRole("button", { name: "Advanced inference settings" })
    .click();
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    scan.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.failureSummary),
    })),
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.locator("#detail-heading")).toHaveText("Qwen3-30B-A3B");
  await expect(page.locator(".comparison-item")).toHaveCount(1);
});
