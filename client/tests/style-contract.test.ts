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
  test("Discover collections use Material tabs with one shared lazy template", () => {
    const source=readFileSync('src/app/discover.component.ts','utf8');
    expect(source).toContain('<mat-tab-group');
    expect(source).toContain('<ng-template matTabContent>');
    expect(source).toContain('[ngTemplateOutlet]="collectionContent"');
    expect(source).not.toContain('mat-button-toggle');
  });
  test("catalog uses Material table/select and header navigation remains semantic links", () => {
    const html=readFileSync('src/app/workspace/workspace.component.html','utf8');
    expect(html).toContain('<table mat-table');
    expect(html).toContain('*matCellDef="let x"');
    expect(html).toContain('<mat-select aria-label="Variant"');
    const modelColumn=html.slice(html.indexOf('matColumnDef="name"'),html.indexOf('matColumnDef="parameters"'));
    expect(modelColumn).not.toContain('<small');
    const header=readFileSync('src/app/app.component.ts','utf8');
    expect(header).not.toMatch(/<a mat-button/);
  });
  test("routed views consistently use Material controls", () => {
    for (const path of ['src/app/workspace/workspace.component.html','src/app/workspace/summary.component.ts','src/app/workspace/favourite-button.component.ts','src/app/discover.component.ts','src/app/components/snackbar.component.ts']) {
      const source=readFileSync(path,'utf8');
      for (const [tag] of source.matchAll(/<button\b[^>]*>/g)) {
        if (/class="(?:score-row|plot-dot)/.test(tag)) continue;
        expect(tag, path).toMatch(/\bmat-(?:icon-button|stroked-button|flat-button|button)\b/);
      }
      for (const [tag] of source.matchAll(/<(?:input|select|textarea)\b[^>]*>/g)) expect(tag,path).toMatch(/\b(?:matInput|matNativeControl)\b/);
      expect(source,path).not.toMatch(/<details\b|<input[^>]*type="checkbox"/);
    }
  });
  test("GPU search uses Material field and native styles exclude Material controls", () => {
    const html = readFileSync('src/app/workspace/workspace.component.html','utf8');
    const styles = readFileSync('src/styles.css','utf8');
    expect(html).toContain('<mat-form-field class="gpu-field" appearance="outline"');
    expect(html).toContain('<mat-autocomplete');
    expect(html).not.toContain('NVIDIA specifications');
    expect(styles).toContain('input:not([type="checkbox"]):not([matInput])');
    expect(styles).toContain('button:not(.mat-mdc-button-base)');
  });
  test("catalog scrolls with the page and navigation stays sticky", () => {
    const styles = readFileSync('src/styles.css','utf8');
    expect(styles).toMatch(/\.app-header\s*\{\s*position: sticky;\s*top: 0;/);
    expect(styles).toMatch(/\.table-scroll\s*\{[^}]*overflow: visible;/);
    expect(styles.match(/\.table-scroll\s*\{/g)).toHaveLength(1);
    expect(styles).toContain('.new-catalog td[data-label]::before');
  });
  for (const path of sources("src").filter(path => !["src/theme.css", "src/index.html"].includes(path.replaceAll("\\", "/")))) {
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
