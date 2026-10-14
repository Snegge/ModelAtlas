# Interaction design rationale

## Design question

**What changes when I adjust my hardware or inference settings?** The primary task is an exploration, rather than selecting a purported “best” model. The interface exposes real constraints and distinguishes stored model releases from their downloadable artifact file sets.

The working surface uses a restrained green/stone palette, a technical typographic hierarchy, modest section labels and a persistent hardware column. The constraint plot and exact-artifact comparison share the primary working surface. Color is supplemented by shapes and status text. All fonts are local system fonts; the interface does not depend on external assets.

No supplied Stuart Card chapter was available in the workspace. This rationale applies established interaction and information-visualization principles without invented quotations or page references. A useful public reference is Ben Shneiderman's _The Eyes Have It_ (1996), [DOI 10.1109/VL.1996.545307](https://doi.org/10.1109/VL.1996.545307).

## Implemented interactions

| Principle                  | Concrete behavior                                                                                                                                                                                                                                    | Purpose / tradeoff                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Overview first             | The first screen shows editable budgets, all matching model points and a shape/status legend, without an introductory banner or redundant counts.                                                                                                    | Establish distribution and constraints before inspection.              |
| Dynamic queries            | Sliders, numeric controls and filters update without Submit. Evaluation is debounced and obsolete HTTP requests are cancelled.                                                                                                                       | Support rapid exploration while preventing stale results.              |
| Linked views               | Focus/click on a table model and click or arrow-key navigation on a plot point share a release/artifact selection. Details and comparison use the same shared Signals store.                                                                         | Preserve one coherent exploration state.                               |
| Details on demand          | Exact variants, breakdowns and source links appear in the detail panel; assumptions and complete file sets expand when requested. Chart coverage and explanations are in Chart info; comparison breakdowns and sources use per-artifact disclosures. | Keep provenance accessible without cluttering the map.                 |
| Direct manipulation        | Changing the GPU budget moves its boundary; requested context moves its threshold.                                                                                                                                                                   | Make the consequence of a budget change spatially visible.             |
| Recognition over recall    | Pinned baseline values and up to three exact artifact selections remain visible.                                                                                                                                                                     | Let users compare without remembering settings or artifact identities. |
| Progressive disclosure     | Cache precision/concurrency are behind a keyboard-accessible CDK accordion; provenance uses native disclosures.                                                                                                                                      | Keep the initial configuration manageable.                             |
| Feedback and reversibility | Loading/updating/error states, active filter chips, limit notifications, clear filters, reset and baseline restoration are implemented.                                                                                                              | Allow experimentation without losing a reference state.                |
| Consistent encoding        | X uses estimated full-residency GiB; Y uses documented context tokens on a labelled base-2 log scale. Green circles, amber diamonds, gray triangles and purple squares have stable meanings.                                                         | Avoid switching semantics across views.                                |
| Visible uncertainty        | Unsupported architecture/incomplete metadata returns Unknown. Records without coordinates stay in the table; Chart info reports exact coverage and omissions.                                                                                        | Avoid mistaking unavailable information for incompatibility.           |
| Accessible alternatives    | Native labelled inputs, visible focus, arrow-key plot navigation with focus tooltips, keyboard model selection, text statuses, an accessible paginated table and reduced-motion rules accompany the canvas.                                          | The chart is not the sole way to access data or calculations.          |

## The constraint map

The model context value is the documented limit, not the requested context or a benchmark score. A point represents **one model release**, using the preferred verified quantization or an explicitly labelled smallest-artifact fallback. Ordinary filters preserve scale extents because the axes derive from the full evaluation, not a partial table page. Zoom is an explicit mode with an explicit reset.

Boundary values appear in a compact legend outside the canvas; GPU and context lines use dashed and dotted strokes without labels obscuring data. Paired artifact markers are explained outside the plot as well. The context axis begins at the minimum documented catalog value (currently 8k) and includes headroom above the largest limit for selected-model labels. Context requests outside the plotted range are explicitly described; they do not stretch the distribution or add an artificial low-context gap. Selected labels are kept inside the canvas.

The shaded region is above the requested-context boundary and left of the GPU-memory boundary. It signifies full GPU memory fit and a sufficient documented context limit. Offloading is a separate planning classification: full-residency memory remains on the X axis even when some weights may reside in RAM. This keeps the encoding stable.

Overlapping releases can occupy similar coordinates. Tooltip inspection and the linked table retain access to every release; the prototype does not jitter real measurements or invent a new “quality” axis. The catalog is small enough to plot the complete matching distribution, with table pages of 12 rows.

## The distinctive what-if interaction

Pinning captures an immutable copy of all hardware/inference settings. The scenario changes independently. The pin action is offered only while no baseline exists. **Clear baseline** or the comprehensive **Reset** removes that reference; clear it and pin again to capture a new one. **Restore baseline** copies the pinned settings into the scenario.

Two separate comparisons are communicated:

1. **Release feasibility:** the overview can select a different quantization under the baseline and scenario. Representative switches are labelled in the table and detail explanation. Feasible means estimated GPU fit or possible weight offloading within the documented context, not verified execution.
2. **Same exact artifact:** the focused artifact gets a blue diamond outline for the baseline and circle outline for live settings; aligned memory bars and numerical differences compare the identical revision and file set under both configurations. Quantization preference changes do not secretly change exact selections.

Comparison bars share one memory scale across the selected artifacts. Weight/cache/runtime/safety components use stable segment colors and explicit numerical values. Explanations are derived from backend estimates: increased cache, a changed GPU boundary with unchanged memory demand, or an available smaller artifact that fits when the inspected one does not. No conclusions about model quality are inferred from quantization alone.

## Responsive workflow

Wide screens use hardware / map-and-comparison / details columns, with the catalog below. The chart height follows the available desktop viewport; compact comparison summaries keep up to three artifacts and paired baseline/live bars on the first screen. This layout was exercised at 1280×720, 1366×768, 1440×900 and 1920×1080. The pinned reference and optional scenario outcomes sit in the hardware column so they do not displace comparison. Chart footer explanations are available through Chart info. Adding from details changes the comparison in place and preserves the user’s scroll position and keyboard focus. The action sits next to the exact-artifact selector. Medium screens move details beneath the exploration column. Narrow screens group hardware controls, then stack the map, retained comparison, catalog and details. The table scrolls inside its own labelled region, preventing document overflow. The workflow remains complete rather than hiding functionality.

## Intentional limits

There is no universal model-quality score, benchmark transfer, fake runtime compatibility or unverified installation command. These would confuse memory feasibility with capability. A conventional filter-and-table condition in the accompanying study will test whether the map and baseline interaction improve understanding, rather than assuming that visualization automatically helps.
