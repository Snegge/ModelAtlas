import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
test("Material icon font is bundled and configured for ligatures", () => {
  const font = readFileSync("public/fonts/material-icons/MaterialIcons-Regular.ttf");
  expect(font.readUInt32BE(0)).toBe(0x00010000);
  const css = readFileSync("src/styles.css", "utf8");
  expect(css).toContain('font-family: "Material Icons"');
  expect(css).toContain('font-feature-settings: "liga"');
  expect(css).toContain('/fonts/material-icons/MaterialIcons-Regular.ttf');
  expect(readFileSync("src/main.ts", "utf8")).not.toContain("MatIconRegistry");
});
