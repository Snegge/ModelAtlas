# ModelAtlas selection workspace

## Start

From the repository root, run `bash scripts/setup-cloud.sh` to restore locked dependencies and build. Node 24 and .NET 10.0.401 are required. In this cloud snapshot initialize:

```sh
export DOTNET_ROOT=/workspace/.tools/dotnet
export PATH="$DOTNET_ROOT:$PATH"
export DOTNET_CLI_HOME=/workspace/.cache/dotnet-cli
export NUGET_PACKAGES=/workspace/.cache/nuget
```

Then run `dotnet run --project server/ModelAtlas.Api --urls http://127.0.0.1:5050` and, in another terminal, `npm start --prefix client`. No keys, database, inference runtime or model downloads are needed.

## Architecture and assumptions

The existing ASP.NET catalog, importer and dedicated-gpu estimator remain intact. Angular's existing AtlasStore provides catalog loading, cancellable evaluation requests and exact artifact estimates. WorkspaceStore owns nullable hardware, task, selected variants, search, view, sort and comparison. A pure ranking module consumes the existing estimates. The shared summary component renders the same results on recommendations, tiles, previews and model routes. Existing low-level session and estimator tests remain applicable; browser tests now target the revised UI.

Model releases retain architecture, parameter count, context and license provenance; artifacts retain exact file sizes, quantization and revision. Runtime configuration is separate. Hardware and comparison IDs persist under a versioned local storage key, with defensive parsing. Search, task, view and selected variants survive route changes in the singleton store. Previous exploration storage is not interpreted as the user's hardware.

No measured benchmark, speed or popularity data was available. `workspace/ranking.ts` contains explicitly synthetic, deterministic demo quality and popularity fixtures keyed by release ID. Quality values are not named benchmark results. Every release receives four synthetic task categories; these categories demonstrate filtering/reranking and are not assertions about capabilities. All tasks averages those four fixtures. Quantized quality differences remain unknown. Demo fields are labelled wherever used and on the information page.

The score uses quality/speed/fit weights 50/25/25, fixed speed normalization (50 tokens/s = 100), fit values 100/55/0 for GPU/offload/incompatible. Missing components are omitted and weights renormalized, with original-weight coverage shown. At least 50% coverage and known fit are required. Only compatible statuses enter recommendations; ties use stable IDs. Recommendations always use All tasks, independent of the catalog task filter. Detail-page recommendation reasons use these All tasks components even when the catalog evaluates another task. Search never affects normalization or recommendations.

Memory uses the existing backend: actual GGUF bytes for weights; full F16 KV cache at requested context; runtime 0.75 GiB + 5% weights; reserve 10% of subtotal. CPU offloading splits weights only; cache/runtime/reserve stay on GPU and host RAM needs offloaded weights + 2 GiB. RAM is never added directly to VRAM. Missing hardware and CPU-only profiles stay unknown. Supported architecture limits remain unchanged.

Full GPU speed is an unvalidated 10–35% range of bandwidth / (weights + KV cache bytes). Offloading has unknown speed without CPU/host bandwidth. This is neither a measured result nor a confidence interval. GPU profiles include RTX 3060 12 GB (360 GB/s) and RTX 3090 24 GB (936 GB/s), with NVIDIA links. Profile changes reset automatic values; overrides remain effective afterward.

The plot uses a fixed linear speed midpoint axis (0–200 tokens/s, clamped above the boundary) against demo task quality (0–100). Missing speed is omitted. Keyboard-focusable points expose names and actual ranges. The wireframe-aligned hero shows one recommendation at a time with visible position, detached side-arrow controls and arrow-key navigation; there is no automatic rotation. Position is shown inside the card; there is no recommendation topline, task selector, carousel footer or workspace toolbar. Position 1 has a next arrow, positions 2–5 have both arrows; next from the last card returns to position 1. The intro sits directly on the page background without an enclosing card. A full-width “Which model fits best?” heading precedes the side-by-side hardware and recommendation columns (stacked on mobile). The application uses a blue palette across navigation, logo, controls and surfaces. The catalog below has task filters and icon view controls. Only Bars and Plot show the adjacent comparison panel; Table and Tiles use the full catalog width. Saved variants persist across view changes, and adding a variant explains where to open the comparison. Bar selection opens a right-hand detail rail; plot selection opens a preview beneath the axes. Quantization chips and segmented memory bars are shared by recommendation and tile cards. The table has no Actions column. Tiles have neither comparison actions nor the evidence dropdown; their detail links lead to full evidence. Chart previews retain comparison and evidence controls. The comparison panel aligns flush with the catalog without a top margin.

Simulation uses a single 100 ms timer and characters/4 approximate tokens. It captures the displayed speed midpoint at Start or an explicitly enabled 12-token/s demo rate. Every prompt receives the same labelled prepared response. Stop/reset/navigation clear timers.

## Validation

Use `npm test --prefix client`, `npm run build --prefix client`, `dotnet test server/ModelAtlas.Tests --no-restore`, and `python3 -m unittest discover -s scripts -p 'test_*.py'`.

With both servers running: `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e --prefix client`. Browser tests cover empty hardware, both required GPU/RAM profiles, manual override, view/search preservation, exact comparison IDs and limit, model routes, simulation, 1440/390 px layouts and axe checks. Screenshots are written to ignored `client/test-results/`. No separate lint script is configured; the production build includes Angular template and TypeScript checks.

## Limits and roadmap

CPU-only, unified memory, multi-GPU and unsupported architectures have no placement estimate. Quality and popularity are demos, not recommendations backed by measurements. Runtime support is unverified. All candidates require tests on the user's own workload. Learning, models of the week, forums, ratings and reviews remain roadmap items without navigation targets or backend scaffolding.

## Notifications and detail actions

Workspace feedback uses a global fixed snackbar with polite live announcement, a dismiss button and a six-second automatic timeout. New messages restart the timeout; route changes do not shift page layout. Detail summaries keep quantization and evidence controls but omit their own Details and Compare actions.

The catalog now contains 84 releases / 252 GGUF artifacts across 14 families. The November 6 expansion added 46 releases while preserving all previous records and comparison identities. Research, included sources and excluded candidates are recorded in [CATALOG-RESEARCH.md](CATALOG-RESEARCH.md) and [DATA-SOURCES.md](DATA-SOURCES.md). New architectures remain unassessable where the existing estimator has no supported formula. The information page reads counts and assembly date from the catalog-status API.

## Favourites replace comparison
The active workspace now has unlimited saved model variants instead of a three-item comparison. The existing atlas.workspace.v2 storage is read compatibly: legacy comparisons migrate into favourites, duplicates and invalid values are removed, and an explicit empty favourites list stays empty. Catalog validation still removes unknown artifact IDs. Hardware reset retains favourites. No backend or ranking formula changes.

The panel is available beside every catalog view, with a native keyboard-operable disclosure and a plain count. At narrow widths it sits above the catalog, without a modal or hidden drawer. Model name is primary; provider, exact saved quantization and estimated memory are secondary. A scrollable list contains long collections. Removing an item moves focus to the next removal control (or the disclosure when empty). Opening a saved model restores its exact variant.

This applies the supplied excerpt's "Not all elements are equal", "Size isn't everything" and spacing-system guidance: fewer competing numbers, stronger model names, muted metadata, 16px grouping and familiar blue controls. No new measured usability claims are made.

Button review: previous mixed line heights and 3px icon-button padding caused uneven baselines; action controls now align through inline flex and consistent gaps. Catalog view icons use centered 44px squares. Table favourite actions and preview controls have readable 13px labels and 44px targets instead of the previous 9�10px text and small padding. Chart marks retain their spatial encoding.

Validation: production build, 15 unit tests including legacy migration, 100 saved IDs and empty-list precedence; six Playwright scenarios at 390/768/1440px covering Discover plus adding six favourites, persistence, every catalog view, disclosure keyboard behavior, removal focus and overflow. Screenshots: client/test-results/favourites-{390,768,1440}.png. Browser fixtures use the bundled catalog and controlled API responses; live backend estimation and the full legacy E2E suite are not covered by this run.

## Star controls and right drawer
Following the user's layout choice, favourites now live in a global right-side Angular Material sidenav, opened from the main navigation on every route. This supersedes the fixed catalog sidebar. The catalog regains its full width; saved models remain available during Discover and model inspection. Mobile uses the same drawer at viewport width.

Angular Material 22.2.2 was explicitly approved and added alongside the existing matching Angular/CDK versions. Material is used for the sidenav and per-model expansion panels; existing controls remain in their established components. A blue Material theme is adapted to the existing paper, text and border tokens.

A shared 44px SVG star button replaces text actions throughout the catalog, summaries, model details, Discover and the drawer. Fill indicates saved state; aria-pressed, accessible Add/Remove labels and a model/variant tooltip preserve meaning without relying on color.

Collapsed panels show model, publisher and saved variant. Expanded content exposes parameters, total/GPU/RAM estimates, maximum/requested context, speed, hardware fit, demo-qualified score, license, memory breakdown, reasons and original source links. Unknown values remain explicit. Multiple panels can be open. Removal preserves focus on the next panel header; the last removal focuses Close. Model-detail links restore the exact saved variant and close the drawer.
Validation for the drawer revision: build and 15 unit tests pass; six Discover/favourites browser scenarios pass at 390/768/1440px. Drawer checks include filled/outline SVG state, persistence, expansion via keyboard, Escape and focus restoration, model navigation, page overflow and axe scans of the drawer. Desktop/mobile screenshots were visually inspected after adapting Material typography and removing excess panel shadows. The complete legacy live-backend E2E suite was not run.

## Inline expansion panel (current layout)
The right drawer has been replaced at the user's request. Favourites now occupy a catalog-adjacent Angular Material expansion panel only when opened. The collapsed state has no reserved sidebar column: an existing toolbar button opens the panel, and the catalog uses the full grid width. Closing the expansion header restores focus to that button and releases the column. On screens up to 800px, the panel stacks above the catalog and does not reduce its width. Model expansion panels, unlimited saved variants and star actions remain intact. The navigation entry opens the Explorer's catalog anchor and panel. There is no backdrop, modal focus trap or global overlay.

## Vertical favourites rail (current)
The navigation link and catalog-toolbar button have been removed. A persistent 44px vertical Favourites rail with count and directional chevron sits at the right edge of the catalog. It opens a local sidebar horizontally (380px on wide desktop, 320px on medium desktop), using the conventional collapsible-sidebar pattern rather than forcing Material's vertical expansion component into a different orientation. Individual model details still use Material expansion panels.

Closed content is inert, hidden from accessibility APIs and occupies no content column beyond the rail. The same rail closes the sidebar without moving focus. Width transitions respect reduced motion. On screens up to 800px the local sidebar overlays the catalog instead of compressing its table; it is not a viewport drawer and has no global navigation trigger or backdrop. The rail remains available for closing.

Validation checks the removed navigation/toolbar entry points, rail width, expanded widths, restored catalog width, model-panel keyboard operation and accessibility at 390/768/1440px.

## Tile-style favourites and catalog actions
Favourites now reuse the catalog's model-tile class and SummaryComponent instead of a second model-detail layout. The saved variant is shown as a fixed label (editing a catalog selection must not silently replace a favourite); score, description, memory display, context/speed, star and Details follow the existing tile structure. Detail links explicitly restore that card's exact variant. Removing a favourite focuses the next card's star or the rail when the list becomes empty.

The table now has a non-sortable Actions column on the far right containing the favourite star. The model-name cell contains only identification, variant selection and status.

Explorer and Discover carousel controls now use the same symmetric SVG chevrons, centered with inline flex. This avoids font glyph baseline offsets. Browser checks compare icon and button centers in the same layout frame and verify the Actions column and shared tile component at 390/768/1440px.
