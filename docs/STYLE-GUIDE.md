# Model Atlas UI style guide

This is the authoritative visual contract for Explorer, Discover, model details,
Method & data, favourites, charts and notifications. It supersedes historical
palette descriptions in design notes. `AGENTS.md` requires contributors and agents
to read it. Tools that do not load repository instructions must be pointed here
explicitly; automated tests enforce the source-level contract regardless of editor.

## Ownership

- `client/src/theme.css`: the single source of visual tokens.
- `client/src/styles.css`: shared elements, states and application layouts.
- `discover.component.css`: Discover layout and content hierarchy, using shared tokens.
- Component-local CSS: only component structure or a documented variant, never a new theme.
- Canvas charts read resolved tokens with `getComputedStyle`; CSS variables cannot be passed directly to ECharts.

Reuse the existing Angular components (`atlas-summary`, `atlas-favourite-button`,
`atlas-memory`) and shared `.surface`, `.actions`, `.details-link` and
`.quantization-chips` rules before creating another implementation. Keep Material
components on the existing Azure theme; custom Material properties must reference
our tokens. Do not introduce a second UI library or remote font dependency.

## Visual language

Use blue for actions and selection, white surfaces, a pale blue page background,
and dark slate text. Keep information dense but readable. Hierarchy comes from
spacing, typography and borders. Reserve shadows for elevated content and the
existing recommendation treatment; do not add decorative gradients or shadows.

| Role | Token | Usage |
| --- | --- | --- |
| Page / card / secondary surface | `--canvas`, `--paper`, `--surface-subtle` | Backgrounds |
| Text / supporting text | `--ink`, `--muted` | Headings, content, metadata |
| Action / hover | `--primary`, `--primary-hover` | Primary buttons and selected markers |
| Link / hover | `--link`, `--link-hover` | Text links |
| Selected surface | `--accent` | Pressed chips and selected rows |
| Borders | `--line`, `--control-border` | Panels vs. input boundaries |
| Focus | `--focus`, `--focus-inverse` | 3 px outline with visible offset |
| Status | `--success`, `--warning`, `--neutral`, `--unknown`, `--danger` | GPU fit, offload, outside budget, unknown, error |
| Memory segments | `--memory-weights/cache/runtime/safety` | Stable encodings in bars and legends |

Status colors communicate data, not branding. Always accompany them with text or
shapes. Never use memory colors for small text. On selected surfaces use `--link` for small blue text: `--primary` on `--accent`
does not reach 4.5:1. White text on primary actions and
inverse notifications is the standard. Preserve WCAG AA contrast: 4.5:1 for normal
text, 3:1 for large text and meaningful UI indicators; test actual rendered pairs.

## Typography and spacing

Use `--font-sans` (local system stack) for UI and `--font-mono` for technical values.
The root is 87.5% of the browser default, so user font preferences remain effective.

| Token | At default browser size | Role |
| --- | --- | --- |
| `--text-caption` | 12 px | Metadata, dense table cells, labels; minimum text size |
| `--text-body` | 14 px | Body and controls |
| `--text-lead` | 16 px | Introductory text and emphasized values |
| `--text-section` | 20 px | Section headings |
| `--text-title` | 28 px | Featured model names and large metrics |
| `--text-page` | Fluid 28–40 px | Page h1 |

Use regular weight 400 or `--weight-semibold` (600). Text line-height is normally
1.5–1.7, headings 1.2–1.3. Preserve semantic heading order; do not choose an HTML
heading merely for its size. Long model names and identifiers must wrap.

Use the `--space-*` scale (4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 48, 64 px).
Prefer 8 px within controls, 16 px within compact groups, 24 px panel padding and
24–32 px between sections. Existing optical offsets and chart geometry may remain
literal; new layout spacing uses the scale. Border widths, icon dimensions and
chart coordinates are geometry, not spacing tokens.

Use `--radius-small` (4 px) for tags/tracks, `--radius-control` (6 px) for controls,
and `--radius-panel` (12 px) for panels/cards. Circles use 50%; flush edges use 0.

## Controls and layout

Primary navigation actions use `.details-link` or Discover's `.discover-primary`;
both share the same primary and hover treatment. Secondary buttons share the
workspace/Discover base rule. Use `aria-pressed` for toggles, `aria-expanded` for
disclosures, and native `disabled` for unavailable actions. Hover must not apply
to disabled controls. Selected items also use a border, inset indicator, text or
icon state, so meaning does not depend on color alone.

Aim for 44 × 44 px interactive targets. Existing dense table headers, plot markers
and compact carousel layouts are exceptions: retain keyboard access and adjacent
spacing, and do not generalize those exceptions to ordinary actions. Icon-only
buttons need accessible names. Inputs need visible labels. Never remove focus
outlines, use placeholder-only labels, or rely on hover for essential information.

Use responsive grids with `minmax(0, 1fr)` and `min-width: 0` for content columns.
Keep the existing content-driven breakpoints; do not add a breakpoint for one
cosmetic discrepancy. Tables scroll inside their container; the page must not
scroll horizontally. Preserve Discover's viewport-height entry, responsive
favourites rail, keyboard carousel and reduced-motion behavior.

## Change and verification workflow

1. Inspect the element and all its states/callers; identify the owning shared rule.
2. Reuse a token/component. Edit the original rule instead of adding a late override.
3. If a new semantic role is necessary, define it here and in `theme.css` together.
4. Run `npm test --prefix client` and `npm run build --prefix client`.
5. With API on 5050 and client on 4200, run `npm run test:e2e --prefix client`.
   Inspect screenshots at 390, 768 and 1440 px. Check Explorer's table, tiles, bars
   and plot; Discover; details; Method; favourites; notifications and empty states.
   Include hover, focus, selected and disabled states and reduced motion.
6. Report limitations. Automated checks do not replace visual review or keyboard testing.

`client/tests/style-contract.test.ts` rejects raw colors, literal font sizes and
radii outside the token file, including component styles. The browser style test
checks shared rendered styles, focus, contrast and overflow across routes. Both
run through the existing CI commands; no extra dependency or separate design-system
application is required. Static SVG brand assets and vendor styles are excluded. The browser theme-color
meta value cannot resolve CSS variables; its literal is tested against `--primary`.

## Icons and Angular Material

Prefer Angular Material components for new interactive UI where a matching
component exists; reuse existing application components and their token bindings.
Use `MatIconModule` and `<mat-icon fontIcon="arrow_forward">` for UI icons.
Use the standard Material Icons font API, including `[fontIcon]` for dynamic names.
The official font is served locally from `public/fonts/material-icons` via the
shared `@font-face` rule, so icons also work offline. No SVG registry or per-icon
asset is needed. The font is Apache-2.0 licensed; its license is included.
For a standalone meaningful icon use, for example:
`<mat-icon aria-hidden="false" aria-label="Home" fontIcon="home"></mat-icon>`.

Do not use Unicode arrows, emoji, handwritten SVGs or CSS-generated characters as
UI icons. Mathematical symbols, data-visualization shapes and the brand logo are
not UI icons. Native select option text uses words such as “ascending”.
Use arrow_forward for details/navigation, open_in_new for external sources,
chevrons for carousels, close for dismiss, star/star_border for favourites and
view_list/view_module/bar_chart/scatter_plot for views. Sort uses arrow_upward or
arrow_downward with aria-sort on the header.

Icons are decorative (`mat-icon` defaults to aria-hidden); the enclosing control
must retain its text or accessible name. Never put icon names in accessible labels.
Use the shared 20px non-shrinking icon box; center icons in existing control targets.
Verify the Material Icons font loads and ligatures render as symbols,
fit inside the icon/control boxes, remain centered and keep their color in selected,
hover and disabled states. Test mobile, tablet and desktop; check the console for
font-loading errors. Use valid Material Icons names without adding per-icon assets.
