import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import { PITCH_SLIDES } from "../../src/app/pitch/pitch-slides";

const titles = [
  "Lokale KI ausprobieren. Aber welches Modell?",
  "Viele Angaben. Noch keine klare Entscheidung.",
  "Unsicherheit führt zu Versuch und Irrtum.",
  "ModelAtlas macht die Grenzen sichtbar.",
  "Was ändert sich, wenn ich etwas ändere?",
];
const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/pitch");
  await expect(page.locator("#pitch-title")).toHaveText(titles[0]);
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

test("direct pitch route, five German slides, English controls and complete optional notes", async ({
  page,
}) => {
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation.getByRole("link")).toHaveText([
    "Explorer",
    "Method & data",
    "Project pitch",
  ]);
  await expect(
    navigation.getByRole("link", { name: "Project pitch" }),
  ).toHaveClass(/active/);
  await expect(page.locator(".pitch-controls")).toHaveAttribute("lang", "en");
  await expect(page.locator(".pitch-page")).toHaveAttribute("lang", "de");
  await expect(page.locator(".pitch-notes")).not.toHaveAttribute("open", "");
  await expect(page.locator(".pitch-notes-content")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Previous", exact: true }),
  ).toBeDisabled();
  await page.getByText("Speaker notes", { exact: true }).click();
  await expect(page.locator(".pitch-notes-warning")).toContainText(
    "visible to the audience",
  );
  await expect(page.locator(".pitch-notes-warning")).toContainText(
    "not a private presenter display",
  );
  await expect(page.locator(".pitch-notes-content")).toHaveAttribute(
    "lang",
    "de",
  );
  const script = fs.readFileSync("../docs/project-pitch.md", "utf8");
  await expect(
    page.getByRole("link", { name: "the complete speaker notes" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/Snegge/ModelAtlas/blob/feature/project-pitch/docs/project-pitch.md",
  );
  expect(
    PITCH_SLIDES.reduce((total, slide) => total + slide.durationSeconds, 0),
  ).toBe(180);
  for (let index = 0; index < titles.length; index++) {
    await expect(page.locator("#pitch-title")).toHaveText(titles[index]);
    await expect(page.locator(".pitch-slide")).toHaveCount(1);
    await expect(page.locator(".pitch-points li")).toHaveCount(3);
    await expect(page.locator(".pitch-counter")).toHaveText(`${index + 1} / 5`);
    await expect(page.locator(".pitch-progress")).toHaveAttribute(
      "value",
      String(index + 1),
    );
    await expect(page.locator(".pitch-visual [role=img]")).toHaveCount(1);
    await expect(page.locator(".pitch-notes-content p")).toHaveText(
      PITCH_SLIDES[index].notes,
    );
    expect(script).toContain(PITCH_SLIDES[index].notes);
    if (index === 3) {
      await expect(page.locator(".pitch-visual")).toContainText(
        "Schematische Darstellung",
      );
    }
    if (index < 4) {
      await expect(
        page.getByRole("link", { name: "Open live demo" }),
      ).toHaveCount(0);
      await page.getByRole("button", { name: "Next", exact: true }).click();
    }
  }
  await expect(
    page.getByRole("button", { name: "Next", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("link", { name: "Open live demo" }),
  ).toHaveAttribute("href", "/");
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.locator("#pitch-title")).toHaveText(titles[3]);
  await expect(page.getByRole("link", { name: "Open live demo" })).toHaveCount(
    0,
  );
});

test("slide keyboard navigation clamps at ends and leaves interactive controls alone", async ({
  page,
}) => {
  const slide = page.locator(".pitch-slide");
  await slide.focus();
  await expect(slide).toBeFocused();
  expect(
    await slide.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe("solid");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#pitch-title")).toHaveText(titles[1]);
  await page.keyboard.press("End");
  await expect(page.locator(".pitch-counter")).toHaveText("5 / 5");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".pitch-counter")).toHaveText("5 / 5");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".pitch-counter")).toHaveText("4 / 5");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".pitch-counter")).toHaveText("1 / 5");
  const next = page.getByRole("button", { name: "Next", exact: true });
  await next.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("End");
  await expect(page.locator(".pitch-counter")).toHaveText("1 / 5");
  await page.keyboard.press("Enter");
  await expect(page.locator(".pitch-counter")).toHaveText("2 / 5");
  await page.getByRole("link", { name: "Method & data" }).focus();
  await page.keyboard.press("Home");
  await expect(page.locator(".pitch-counter")).toHaveText("2 / 5");
  await page.locator(".pitch-notes summary").focus();
  await page.keyboard.press("End");
  await expect(page.locator(".pitch-counter")).toHaveText("2 / 5");
  // The presentation has no input fields. Exercise the shortcut guard with
  // an editable target so future controls cannot inherit document shortcuts.
  for (const type of ["input", "editable"]) {
    await page.evaluate((type) => {
      const element = document.createElement(
        type === "input" ? "input" : "div",
      );
      element.id = "keyboard-test-target";
      if (type === "editable") element.contentEditable = "true";
      document.querySelector(".pitch-page")!.append(element);
      element.focus();
    }, type);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Home");
    await page.keyboard.press("End");
    await expect(page.locator(".pitch-counter")).toHaveText("2 / 5");
    await page
      .locator("#keyboard-test-target")
      .evaluate((element) => element.remove());
  }
});

test("real fullscreen belongs to the persistent shell, survives demo navigation and retains explorer state", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Explorer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeEnabled();
  await page.getByRole("button", { name: "Pin as baseline" }).click();
  await page.locator("#gpu-exact").fill("24");
  await page.locator("#context-exact").fill("16384");
  await page.locator("#quant-preference").selectOption("Q8_0");
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeEnabled();
  await page.locator("tbody .model-select").nth(2).click();
  const exact = await page
    .locator("#detail-artifact option")
    .last()
    .getAttribute("value");
  await page.locator("#detail-artifact").selectOption(exact!);
  await page
    .getByRole("button", { name: "Compare this exact artifact" })
    .click();
  await expect(page.locator(".comparison-item")).toHaveCount(1);
  await page.locator("#search").fill("Qwen");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("model-atlas.session.v1")!),
  );
  expect(stored.focused).toBe(exact);
  expect(stored.baseline.gpuGiB).toBe(12);
  await page.getByRole("link", { name: "Project pitch", exact: true }).click();
  await page.getByRole("button", { name: "Enter fullscreen" }).click();
  await expect(page.locator(".app-shell:fullscreen")).toHaveCount(1);
  await expect(
    page.locator(".pitch-controls button", { hasText: "Exit fullscreen" }),
  ).toBeVisible();
  await page.locator(".pitch-slide").focus();
  await page.keyboard.press("End");
  await page.getByRole("link", { name: "Open live demo" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".app-shell:fullscreen")).toHaveCount(1);
  await expect(page.locator("#gpu-exact")).toHaveValue("24");
  await expect(page.locator("#context-exact")).toHaveValue("16384");
  await expect(page.locator("#quant-preference")).toHaveValue("Q8_0");
  await expect(page.locator("#detail-artifact")).toHaveValue(exact!);
  await expect(page.locator(".comparison-item")).toHaveCount(1);
  await expect(page.locator(".baseline-values")).toContainText("12 GiB GPU");
  await expect(page.locator("#search")).toHaveValue("Qwen");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("model-atlas.session.v1")!),
    ),
  ).toEqual(stored);
  const exit = page.getByRole("button", {
    name: "Exit fullscreen",
    exact: true,
  });
  await expect(exit).toBeInViewport({ ratio: 1 });
  await page.evaluate(() =>
    document.querySelector(".app-shell")!.scrollTo(0, 400),
  );
  await expect(exit).toBeInViewport({ ratio: 1 });
  await exit.click();
  await expect(page.locator(".app-shell:fullscreen")).toHaveCount(0);
  await expect(exit).toHaveCount(0);
  await page.getByRole("link", { name: "Project pitch", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Enter fullscreen" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Enter fullscreen" }).click();
  await expect(page.locator(".app-shell:fullscreen")).toHaveCount(1);
  // Headless Chromium does not implement the native browser Escape exit.
  // Exit through the real browser API to verify the same fullscreenchange
  // synchronization used by browser Escape, rather than toggling app state.
  await page.evaluate(() => document.exitFullscreen());
  await expect(page.locator(".app-shell:fullscreen")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Enter fullscreen" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Exit fullscreen" }),
  ).toHaveCount(0);
});

test("unsupported fullscreen remains usable and reports its limitation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "fullscreenEnabled", {
      configurable: true,
      get: () => false,
    });
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Enter fullscreen" }),
  ).toBeDisabled();
  await expect(page.locator(".pitch-feedback")).toContainText(
    "Fullscreen is unavailable",
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".pitch-counter")).toHaveText("2 / 5");
  await expect(page.locator(".shell-fullscreen-exit")).toHaveCount(0);
});

test("rejected fullscreen requests give feedback without claiming fullscreen", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLElement.prototype.requestFullscreen = () =>
      Promise.reject(new DOMException("Not allowed", "NotAllowedError"));
  });
  await page.reload();
  await page.getByRole("button", { name: "Enter fullscreen" }).click();
  await expect(page.locator(".pitch-feedback")).toContainText(
    "could not change fullscreen mode",
  );
  await expect(
    page.getByRole("button", { name: "Enter fullscreen" }),
  ).toBeEnabled();
  await expect(page.locator(".app-shell:fullscreen")).toHaveCount(0);
  await expect(page.locator(".shell-fullscreen-exit")).toHaveCount(0);
});

test("all slides fit laptop and projector screens; mobile has no overflow; reduced motion and accessibility", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1024, height: 768 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.locator(".pitch-slide").focus();
    await page.keyboard.press("Home");
    for (let index = 0; index < 5; index++) {
      await page.evaluate(() => window.scrollTo(0, 0));
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        width: innerWidth,
        animation: getComputedStyle(
          document.querySelector(".pitch-visual > *")!,
        ).animationName,
        fontSize: parseFloat(
          getComputedStyle(document.querySelector("#pitch-title")!).fontSize,
        ),
      }));
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
      expect(metrics.animation).toBe("none");
      if (viewport.width >= 1024) {
        expect(metrics.fontSize).toBeGreaterThanOrEqual(34);
        await expect(page.locator(".pitch-slide")).toBeInViewport({ ratio: 1 });
        await expect(page.locator(".pitch-controls")).toBeInViewport({
          ratio: 1,
        });
        await expect(page.locator(".pitch-notes summary")).toBeInViewport({
          ratio: 1,
        });
      }
      const report = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(report.violations).toEqual([]);
      if (index < 4) await page.keyboard.press("ArrowRight");
    }
    await page.screenshot({
      path: `test-results/pitch-${viewport.width}.png`,
      fullPage: true,
    });
  }
  await page.getByText("Speaker notes", { exact: true }).click();
  const notesReport = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(notesReport.violations).toEqual([]);
});
