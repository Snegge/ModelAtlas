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

Catalog expansion research is recorded in [CATALOG-RESEARCH.md](CATALOG-RESEARCH.md). The expansion is pending Hub network access and is not included in the current 38-release snapshot.
