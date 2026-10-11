# Validation evidence

Validated in the implementation cloud machine on 11 October 2026 using Node 24.19.0, npm 11.9.0 and 12.2.0, .NET SDK 10.0.401 / runtime 10.0.12, Python 3.12.14 and installed Chromium through Playwright.

| Check | Result |
|---|---|
| Locked NuGet restore and `npm ci` | Passed; dependency lockfiles included |
| npm 12.2.0 clean install and script policy | Passed; no pending install-script approvals; four reviewed helpers approved by exact version |
| `npm audit --prefix client` | **Zero vulnerabilities** after updating ECharts to 6.1.0 and Vitest to 4.1.11; audit also runs in CI |
| Reusable `scripts/setup-cloud.sh` | Executed successfully: restore, install, .NET Release build, Angular production build |
| ASP.NET Core Release build | Passed; zero warnings and errors |
| Angular production build | Passed; approximately 991 kB initial uncompressed JS/CSS, 271 kB estimated transfer |
| C# estimator / real-catalog tests | **12 passed**, none skipped |
| Frontend state / CSV utility tests | **6 passed**, none skipped |
| Importer / real-snapshot tests | **5 passed**, none skipped |
| Playwright browser/API flows | **19 passed**, none skipped, including six project-pitch flows |
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

## Project pitch validation

The `/pitch` route was loaded directly and refreshed in Chromium. Tests verify all five slides in order, German slide content and diagram descriptions, English navigation and controls, matching German speaker notes in `docs/project-pitch.md`, and a total scripted duration of 180 seconds. Only the active slide is mounted. Notes start collapsed and warn that a mirrored projector exposes them to the audience.

Previous/Next, Left/Right, Home/End, end boundaries and visible keyboard focus were exercised. Shortcuts leave buttons, links, disclosure controls, inputs and editable elements alone. Reduced-motion checks disable illustration fades and progress transitions. WCAG-tagged axe checks pass for every slide at 1024×768, 1280×720, 1366×768, 1920×1080 and 390×844, plus expanded notes. Desktop slides, controls and the collapsed notes disclosure fit within those desktop viewports. Screenshots were inspected; additional checks found no document overflow at 320, 600 and 768 px widths.

Real Fullscreen API entry and exit were tested. Fullscreen survives the final navigation to Explorer because its target is the persistent shell. Hardware, context, quantization, focused exact artifact, comparison, filters and baseline remain unchanged; the demo's fixed Exit fullscreen button stays available while scrolling. Unsupported and rejected fullscreen requests were tested with browser API overrides and provide feedback without claiming an active fullscreen state.

Headless Chromium does not perform the native browser Escape exit. The real `document.exitFullscreen()` API was used to verify the same `fullscreenchange` synchronization path, including corrected controls after an external exit. Native Escape in a normal browser, other browser engines, actual classroom projection and screen-reader speech remain manual checks; no private presenter display is claimed.

## What this evidence does not establish

No model weights were fully downloaded and no inference runtime was run. Model execution, throughput, quantization accuracy, effective long-context behavior, CPU-only/unified-memory configurations and Windows execution were **not** validated. PowerShell startup commands and VS Code tasks are provided; the executed platform was Linux. Memory estimates are planning heuristics, separately labelled from unverified runtime compatibility.

There are no benchmark quality rankings. The usability study is a plan, not a conducted study. Cloud configuration saving is separate from publishing/restoring a new cloud task; no fresh-task restoration is claimed.
