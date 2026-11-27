import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sources(path) : /\.(css|ts|html)$/.test(path) ? [path] : [];
  });
}

const theme = readFileSync("src/theme.css", "utf8");
const tokens = new Set([...theme.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]));
describe("visual contract", () => {
  for (const path of sources("src").filter(path => path !== "src/theme.css" && path !== "src/index.html")) {
    test(path, () => {
      const source = readFileSync(path, "utf8");
      expect(source, "Use Material fontIcon, not inline SVG or svgIcon").not.toMatch(/<svg\b|\bsvgIcon\b/);
      expect(source, "Colors belong in theme.css").not.toMatch(/#[\da-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i);
      expect(source, "Use typography and radius tokens").not.toMatch(/(?:font-size|border-radius)\s*:\s*[\d.]+(?:px|rem|em)\b/);
      expect(source, "Named colors also belong in tokens").not.toMatch(/(?:color|background(?:-color)?|border(?:-color)?)\s*:[^;{}]*\b(?:white|black|blue|green|red|gray|grey)\b/);
      for (const [, token] of source.matchAll(/var\((--[\w-]+)/g)) {
        expect(tokens.has(token), `${path}: undefined ${token}`).toBe(true);
      }
    });
  }
  test("browser chrome matches the primary token (meta cannot resolve CSS variables)", () => {
    const primary = theme.match(/--primary:\s*([^;]+);/)![1];
    expect(readFileSync("src/index.html", "utf8")).toContain(`name="theme-color" content="${primary}"`);
  });
  test("tokens have unique definitions and no dangling references", () => {
    expect([...theme.matchAll(/(--[\w-]+)\s*:/g)]).toHaveLength(tokens.size);
    for (const [, token] of theme.matchAll(/var\((--[\w-]+)/g)) expect(tokens.has(token)).toBe(true);
  });
});
