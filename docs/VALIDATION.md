> Historical prototype documentation. The 2026-11-27 catalog, quality, GPU-only estimates and update rules are documented in [CATALOG-QUALITY.md](CATALOG-QUALITY.md), which supersedes earlier counts, synthetic scores and partial-placement behavior below.

## Feature branch pre-push validation — 2026-11-27

52 frontend unit/contract tests, the Angular production build, 27 .NET tests and
13 Python importer tests pass. The complete Chrome browser run reported success
for all 47 scenarios, but did not exit after the final scenario; it was interrupted
during shutdown. The recent targeted five-scenario run exited successfully.
NuGet vulnerability metadata remained unreachable (NU1900); tests compiled and ran.
A repository-wide credential-pattern scan passed; actual local secrets, caches,
model weights and browser artifacts are ignored. Firefox/Safari were not checked.

## WillItRunAI-inspired workspace — 2026-11-27

Visual follow-up: memory runtime uses ochre, reserve purple and free space an
outlined pale surface, using shared tokens in bars and legends. Directional icons
use iconPositionEnd in text actions. Sort hover surfaces use the pill radius token.
The hardware form is a surface card with heading and grouped reference GPU specs.
Recommendation carousel summaries hide evidence expansion panels; details keep
their evidence. Discover highlight and feature headings are keyboard-accessible
links to their exact model detail routes. 52 unit/style tests, the production
build, all 42 existing browser scenarios and two additional desktop/mobile tests
passed. Additional checks cover trailing arrow geometry, all five carousel pages
without expansion panels, memory encodings/borders, and both title links by click
and Enter. Desktop/mobile screenshots were inspected. Chrome only; no estimates,
catalog data, dependencies or running services were changed.

Interaction fixes follow-up: recommendations retain automatic model ranking but
display the same explicitly selected variant as the table/details; chips update
the card immediately, including an unfit zero-score variant without jumping to a
different model. Removed the Bars explanatory paragraph and added a shared short
Material score tooltip to cards, table score/header, bars and previews. Favourite
hover uses one whole-button surface with no additional circular state layer.
Sort arrows use muted text and softer padded hover surfaces; carousel arrows use
outlined white surfaces. Discover feature is no longer sticky so its top aligns
with the shortlist; Method paragraphs fill the content width. Router fragments use
a measured sticky-header offset; Discover entry actions focus/scroll to the active
collection tab after lazy rendering. Tests verify variant synchronization, unfit
selection, score tooltip display and all detail/Method anchor positions on mobile
and desktop. 52 unit/style tests and production build pass. Of 42 browser scenarios,
39 passed in the full run and the three carousel-style checks passed after the
final CSS correction, alongside three cross-route style checks. Screenshots were
inspected. Chrome only; existing services were used without starting background
servers. No estimation formula or catalog data changed.

Discover tabs follow-up: replaced collection toggles with MatTabGroup and lazy
MatTabContent. All tabs render the same NgTemplateOutlet content definition; only
the active collection's shortlist/detail view is mounted. Selected state follows
the existing collection signal, including programmatic resets from the carousel.
Material owns keyboard focus, Home/End/Enter activation and narrow-header
pagination. Removed toggle-only and mobile two-column filter styles. Official
Material tabs documentation was reviewed. Production build and 52 unit/style
tests pass; Discover navigation/keyboard, layout and accessibility/style flows
cover 390/768/1440px. Tested with Chrome; no services were started or restarted.

Layout polish follow-up: Model cells have no small/status text; MatSort headers
include action descriptions, live announcements, padded hover surfaces and fixed
column shares. Discover collection switches use exclusive Material toggles and
all shortlist cards share padding, wrapping and metric presentation. Reduced the
Explorer intro/catalog gap; both carousels use primary-colored arrows. UI renamed
Suitability score to Score without changing the API or calculation. Method's four
weights occupy one 45/25/15/15 proportional row. Tests cover stable header bounds
across all sort columns, filter target sizes, all four collection layouts, no
overlapping shortlist text, no Model-cell small tags and mobile score-bar geometry.
51 unit/style tests, all 40 browser scenarios and the production build pass;
browser evidence covers 390/768/1440 pixels, including accessibility. Desktop and
mobile screenshots were inspected. The final mobile toggle grid and compact Util
label passed the three targeted layout scenarios again. Chrome only.

Material application corrections: restored semantic header router links with
active underlines; shared quantization and carousel styling across routes; true
icon-only catalog view buttons; symmetrical recommendation padding with the rank
in normal flow; explicit label/count gap inside Material's rail label projection.
Catalog now uses MatTable data/column/row definitions and MatSelect variants,
preserving filtering, ordering, selected artifacts, page scrolling and mobile
reflow. Successful fit text was removed from rows; non-fitting reasons remain.
Reviewed official Material button/table/select documentation (linked in the style
guide). 51 unit/style tests and production build passed; all 34 existing browser
scenarios passed after the table migration. Three additional scenarios passed at
390/768/1440px verifying actual cross-route button appearance, card padding,
toolbar icon centres, rail spacing, Material table/select and keyboard selection.
Final desktop/mobile screenshots were inspected. Chrome only; no calculation,
catalog or backend changes were needed.

Material consistency follow-up: routed Explorer, Discover, model details and Method
now share Material action/navigation buttons, outlined input/select fields,
checkboxes and expansion panels. Compact variant selects retain native option
semantics inside Material fields. Plot/bar data markers remain specialized.
The style contract checks ordinary routed controls for Material directives.
Shared typography uses local design tokens. Layout corrections preserve hardware
field gaps, growing Discover selection rows, the 44px favourites rail, 20px icons
and contained carousel focus/ripple layers. No new dependency or data/ranking
change was required. Validation: 50 unit/style tests, production build and the
desktop/tablet/mobile browser suite, including accessibility and visual review.

GPU picker follow-up: separate reactive search text from committed hardware; use
an outlined Material field/autocomplete with Material suffix clear action and
local typography. General recommendations and all releases remain visible with
no GPU, during uncommitted searches, after clearing and after reset. Restored
hardware now compares field values rather than JSON key order, fixing empty
recommendations and permanently pending estimates after reload. An outdated API
catalog produces a restart/retry message instead of a rendering exception.
Verified with 49 unit/style tests, production build, 3 targeted browser scenarios
and 23 related regression scenarios. The targeted scenarios include pointer and
keyboard selection, invalid searches, clearing, persisted selection, reset,
old-API recovery and desktop/mobile accessibility. Local development services on
5050/4200 were restarted with the current build; the frontend uses file polling.

- Real public metadata import published 44 releases / 132 variants / 9 families. All previous 29 qualified releases remain; 62 source/release exclusions are documented. No model inference or complete weight download occurred.
- 27 .NET tests passed, including complete published estimates, score components, tight/failed fit boundaries, RAM isolation, variant ranking and last-good catalog retention.
- 47 frontend unit/style tests passed; Angular production build passed without warnings.
- 13 Python tests passed, including exact checkpoint matching, explicit editorial versus benchmark evidence, bounded GGUF parsing, pagination, secret stripping on redirects and atomic update failure handling.
- 31 Playwright scenarios passed after fixing mobile table overflow and updating the changed control expectations. The five affected catalog/accessibility/layout flows passed again after the final display changes. Tests used isolated API/client ports 5051/4201 and installed Chrome; the bundled Playwright Chromium executable was unavailable.
- Browser coverage: 390/768/1440 px, keyboard GPU search, automatic specifications, all four task filters, full GPU gating, RAM independence, retry, K contexts, VRAM bars, sticky navigation, page scrolling, shared views, favourites, sources, accessibility and screenshots. Desktop/mobile screenshots were inspected.
- NuGet vulnerability metadata could not be reached (NU1900); compilation and tests completed. No new packages were added. Speed remains an uncalibrated heuristic and mixed quality sources are not a uniform benchmark ranking. Manual editorial profile review remains necessary; metadata refresh alone does not refresh those ratings.

# Catalog expansion validation — November 6, 2026

The bundled catalog now contains **84 distinct releases / 252 exact GGUF artifacts / 14 families**, up from 38 / 114 / 6. Live public Hub metadata and bounded binary headers validated 46 additions out of 61 candidates. An explicit comparison against the previous committed snapshot confirmed that every existing release and artifact record remains unchanged, including comparison IDs and retrieval dates. Eight artifacts contain complete multi-file sets. No full model weights or inference were run.

| Check | Result |
|---|---|
| Importer and snapshot tests | **8 passed**; includes preservation on failed extension, coverage target enforcement and deterministic duplicate handling |
| Backend tests | **12 passed** against expanded snapshot; minimum 76 releases, family diversity and artifact coverage asserted |
| Frontend unit tests | **14 passed** |
| .NET Release build | Passed, zero warnings/errors |
| Angular production build / TypeScript / template checks | Passed |
| Playwright browser scenarios | **12 passed**, including new-family search, Q8 variant retention through all views, original artifact citations and live methodology counts |
| Desktop/mobile accessibility | Existing axe checks passed at 1440 × 1000 and 390 × 844; no document overflow in checked views |
| Visual inspection | New Granite tiles inspected at 1440 px desktop and 390 px mobile; screenshots in ignored `.cache/catalog-expansion/` |
| Local API coverage | 84 releases / 252 artifacts / 14 families |
| RTX 3060 scenario: 12 GiB VRAM, 48 GiB RAM, 8192 context, Q4_K_M, no offload | 33 estimated GPU fits, 17 outside budget, 34 unknown |
| RTX 3090 scenario: 24 GiB VRAM, 128 GiB RAM, same context/quantization | 43 estimated GPU fits, 7 outside budget, 34 unknown |
| `git diff --check` | Passed |

The browser run exposed a select-rendering defect: after returning to Table, the native select could show Q4 while the shared calculation still used the chosen Q8. Angular Forms binding now keeps the control synchronized when its options are recreated; the new browser scenario covers this regression. A previous task-switch assertion now waits for the asynchronous UI update. The final full browser rerun passed all scenarios. Earlier snackbar and detail-action behavior remains covered.

The 34 unassessable releases in these scenarios remain explicit Unknown; adding metadata did not expand estimator architecture support. Quality and popularity remain Demo fixtures. These scenario counts are reproducible heuristic outcomes, not measurements of local model performance. No standalone lint command is configured.

# Latest UI check

Snackbar/detail revision: production build, 14 frontend/unit tests and all 11 Playwright scenarios passed. New scenarios verify fixed-position feedback without layout shifts, automatic dismissal after six seconds, manual dismissal, and absence of redundant detail actions. The subsequent catalog expansion is documented below and in [CATALOG-RESEARCH.md](CATALOG-RESEARCH.md).

# Current workspace validation

The interface has been revised to the hardware shortlist, four synchronized catalog views and routed detail workflow. Historical evidence below describes the previous interface. Current commands, assumptions and scenarios are documented in [PROTOTYPE.md](PROTOTYPE.md). The browser suite now targets the revised flows.

Validated on 2026-11-06: 14 frontend/unit tests, 12 backend tests, 5 importer tests and 9 Playwright scenarios passed. The production Angular build (including TypeScript/template checks) passed. Browser scenarios exercised 1440 × 1000 and 390 × 844 viewports, RTX 3060 with 48 GiB RAM and RTX 3090 with 128 GiB RAM, keyboard plot selection, exact variant comparison, offloading and simulation. Desktop and mobile axe scans reported zero violations. Desktop and mobile screenshots were inspected; generated evidence is in ignored `client/test-results/`. An additional browser check confirmed the score explanation link navigates and scrolls to its section. The wireframe layout revision additionally checks desktop region positions, all five carousel positions and arrow-key navigation, the bar detail rail and the plot preview position. Desktop, mobile and bar-view screenshots were visually inspected. The blue-theme/layout revision reran all 14 frontend tests, 9 browser scenarios, production build and accessibility scans successfully. Layout assertions verify the shared heading above aligned hardware/recommendation columns, the transparent borderless intro, full-width Table/Tiles, and comparison visibility only in Bars/Plot. `git diff --check` passed. The simplified-carousel revision also passes all 9 browser scenarios: recommendations remain on All tasks while catalog tasks change, carousel arrows have at least 8 px separation from the card, positions 2–5 expose both arrows, the comparison panel has zero top margin, the table has six columns and no row-action buttons, and tiles have no comparison/evidence controls. Desktop and mobile screenshots were inspected. No standalone lint command is configured.

# Validation evidence

Validated in the implementation cloud machine on 11 October 2026 using Node 24.19.0, npm 11.9.0 and 12.2.0, .NET SDK 10.0.401 / runtime 10.0.12, Python 3.12.14 and installed Chromium through Playwright.

| Check | Result |
|---|---|
| Locked NuGet restore and `npm ci` | Passed; dependency lockfiles included |
| npm 12.2.0 clean install and script policy | Passed; no pending install-script approvals; four reviewed helpers approved by exact version |
| `npm audit --prefix client` | **Zero vulnerabilities** after updating ECharts to 6.1.0 and Vitest to 4.1.11; audit also runs in CI |
| Reusable `scripts/setup-cloud.sh` | Executed successfully: restore, install, .NET Release build, Angular production build |
| ASP.NET Core Release build | Passed; zero warnings and errors |
| Angular production build | Passed; approximately 967 kB initial uncompressed JS/CSS, 265 kB estimated transfer |
| C# estimator / real-catalog tests | **12 passed**, none skipped |
| Frontend state / CSV utility tests | **6 passed**, none skipped |
| Importer / real-snapshot tests | **5 passed**, none skipped |
| Playwright browser/API flows | **13 passed**, none skipped |
| axe WCAG-tagged checks | Passed for desktop, 390 px viewport and an unknown-model/baseline/comparison state; not an accessibility certification |
| Backend and development proxy health/coverage requests | Passed: 38 releases / 114 artifacts |
| Desktop and narrow-screen screenshots | Inspected; narrow-screen flow has no document-level horizontal overflow |
| Browser interaction errors | No page errors observed in desktop and narrow-view flow tests |

The populated importer was run against public Hugging Face sources during implementation. It produced **38 distinct releases, 114 complete artifacts across six families**, including six multi-file artifacts. Final importer normalization was also checked against bundled metadata for an original-config/gated-config example and the retained MoE release. Five curated candidates were unavailable or lacked a verified base-model mapping and were reported instead of synthesized.

## Meaningful behaviors exercised

- Larger requested context increases cache and total estimates; FP32/cache concurrency have the expected multipliers.
- Real Q4/Q5/Q8 artifacts have distinct file-byte weight estimates; every complete file set conserves the sum of its file sizes.
- Missing KV metadata, unsupported architectures and MoE produce explicit Unknown results.
- VRAM and RAM remain separate; partial weight placement conserves stored weights; a 2 GiB host reserve is required; zero VRAM does not masquerade as CPU-only support.
- Baseline snapshots do not mutate during scenario changes; restoration, clearing, reset and persistence work.
- The workspace omits presets, the introductory banner and redundant overview counts. Comparison follows the plot, remains fully visible with three artifacts and a baseline at desktop sizes from 1280×720 through 1920×1080, and updates without automatic scrolling or focus changes.
- Chart coverage, omissions and reading guidance are available via the keyboard-operable Chart info disclosure. Comparison breakdown/source disclosures work without expanding their initial summaries.
- The full-catalog context axis stays at 8k–128k during filters and out-of-range requests. Boundary values are outside the canvas; the complete selected 128k model label fits inside the rendered canvas on desktop and a 390 px viewport.
- Quantization preference can change overview representatives while the inspected exact artifact stays unchanged.
- Catalog focus, pointer selection and arrow-key plot navigation synchronize with details; exact variant selection retains the release highlight.
- A fourth comparison is rejected with an explanation; the first three remain intact. Explicit removal permits a new addition.
- Empty searches recover; comparison/detail selections persist outside filters. Saved comparisons reload safely while catalog metadata is delayed; clearing a changed baseline keeps explanation data consistent with its evaluation. Every browser flow checks console errors as well as uncaught runtime errors.
- Exported settings, units, source identities and artifact estimates agree with the canonical backend evaluation.
- Cancelled/slower obsolete evaluations cannot replace the newer configuration.
- Custom hardware controls, filters, sort, fit-only mode, cache settings, offloading, routing, disclosures, zoom enable/reset and source links are functional.
- Failed refresh tests preserve the last valid snapshot; bounded parsing can read quantization after tokenizer arrays.

## What this evidence does not establish

No model weights were fully downloaded and no inference runtime was run. Model execution, throughput, quantization accuracy, effective long-context behavior, CPU-only/unified-memory configurations and Windows execution were **not** validated. PowerShell startup commands and VS Code tasks are provided; the executed platform was Linux. Memory estimates are planning heuristics, separately labelled from unverified runtime compatibility.

There are no benchmark quality rankings. The usability study is a plan, not a conducted study. Cloud configuration saving is separate from publishing/restoring a new cloud task; no fresh-task restoration is claimed.

## UI style unification — 2026-11-26

The current visual contract is [STYLE-GUIDE.md](STYLE-GUIDE.md).
`npm test --prefix client` passes all 43 checks, including the new token contract;
`npm run build --prefix client` passes. The route-level style suite passes at
390, 768 and 1440 px, checking surfaces, primary/hover/focus states, document
width and axe accessibility on Explorer, Discover, model details and Method.
Desktop/mobile Explorer and tablet Discover screenshots were visually inspected.
The local browser was system Chromium (`CHROMIUM_PATH=/usr/bin/chromium`).

The full existing browser suite is **not green**. Sixteen existing flows passed;
four existing exploration tests remain unresolved:

- Two tests request the `← Explorer` link; the current template and pre-change
  HEAD instead provide `Adjust hardware in Explorer →` and the main navigation.
- One requests `Advanced: context & memory` and its context input, which are absent
  from both the current workspace template and pre-change HEAD.
- One assumes Tab after closing the favourites rail leaves focus in the document;
  focus reaches `body` in this browser run. This was not baseline-retested.

The initial new style tests also caught insufficient contrast in Discover's
selected labels; those labels now use `--link` and the style tests pass.
No backend, ranking, storage or catalog behavior was changed. The legacy canvas
chart consumes the shared tokens but is not mounted on the current routes, so
its rendering was not browser-tested. Firefox, Safari and manual screen-reader
behavior were not checked in this change.

## Material icons — 2026-11-26

Bundled official Material SVG assets now render through Angular Material MatIcon.
44 unit/contract tests and the production build pass. Eleven relevant existing
browser tests pass (Discover, favourites, detail/Method, plot and style contract).
Three additional icon tests pass at 390, 768 and 1440px, checking SVG loading,
20px geometry, inherited fill, decorative accessibility, no page overflow and no
browser console errors across catalog views, details and Discover. Existing
carousel tests also verify icon centering. The mobile Discover screenshot was
visually inspected. The four previously recorded exploration test failures were
not rerun; legacy unmounted components and Firefox/Safari were not browser-tested.

## Uniform catalog tiles — 2026-11-27

Catalog tiles use the summary's compact mode to omit the redundant fit paragraph
and RAM advice; recommendations, favourites and details retain their existing
content. Equal grid rows, a two-line description area and bottom-aligned actions
keep tile heights uniform without a fixed pixel height.
52 unit/contract tests, the production build and five relevant browser checks pass.
The new checks cover all catalog tile heights with/without a GPU, short/long text,
no redundant paragraphs, overflow and detail navigation at 390/768/1440px.
Screenshots at these widths were inspected in Chrome; Firefox/Safari were not checked.

## Memory palette C — 2026-11-27

Replaced palette B with the proposed blue/cyan/violet/berry/pale gray tokens.
52 unit/contract tests, the production build and both visual-followup browser
flows pass. Memory cards were visually checked at 390/768/1440px in Chrome.
Firefox and Safari were not checked.

## Open hardware form and muted memory palette — 2026-11-27

Intro layout C removes the hardware card surface and outer padding, preserves
Material fields and grouped GPU specs, and uses a 24px grid gap. Memory palette B
uses the shared tokens across cards, legends and detail charts; free space remains
outlined. The guide and browser assertions reflect the selected design.
52 unit/contract tests, the production build and eight relevant browser checks
pass at 390/768/1440px. Screenshots cover the selected GPU state at these widths.
Checks use installed Chrome; Firefox and Safari were not checked.

## Table and link refinements — 2026-11-27

The catalog header cells use the subtle surface token; separate table borders
allow rounded corners without clipping focus indicators or adding nested scrolling.
Discover model headings share Explorer's color-only hover, and trailing Material
button icons have no additional horizontal margins. Memory palettes and intro-grid
layouts are proposals only, available in `.cache/design-options.html`.
52 unit/contract tests, the production build and eight relevant browser tests pass
at 390, 768 and 1440px. The desktop screenshot and proposal sketches were inspected.
Browser checks use installed Chrome; Firefox/Safari were not checked.

## Standard fontIcon API — 2026-11-26

All UI icons now use fontIcon/[fontIcon] with the official locally served Material
Icons font. The SVG registry and individual SVG assets were removed. 44 unit tests
and the production build pass. Eleven existing browser flows pass; the three
updated icon flows pass at 390/768/1440px after waiting for dynamic view changes.
Checks cover successful font loading, ligature glyph widths, fixed icon geometry,
accessible decoration and page overflow. Mobile Discover was visually inspected.
Firefox/Safari and the previously recorded unrelated exploration failures were
not retested.
