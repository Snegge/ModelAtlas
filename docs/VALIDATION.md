# Validation evidence

Validated in the implementation cloud machine on 11 October 2026 using Node 24.19.0, npm 11.9.0, .NET SDK 10.0.401 / runtime 10.0.12, Python 3.12.14 and installed Chromium through Playwright.

| Check | Result |
|---|---|
| Locked NuGet restore and `npm ci` | Passed; dependency lockfiles included |
| Reusable `scripts/setup-cloud.sh` | Executed successfully: restore, install, .NET Release build, Angular production build |
| ASP.NET Core Release build | Passed; zero warnings and errors |
| Angular production build | Passed; approximately 959 kB initial uncompressed JS/CSS, 261 kB estimated transfer |
| C# estimator / real-catalog tests | **12 passed**, none skipped |
| Frontend state / CSV utility tests | **6 passed**, none skipped |
| Importer / real-snapshot tests | **5 passed**, none skipped |
| Playwright browser/API flows | **11 passed**, none skipped |
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
- Quantization preference can change overview representatives while the inspected exact artifact stays unchanged.
- Catalog focus, pointer selection and arrow-key plot navigation synchronize with details; exact variant selection retains the release highlight.
- A fourth comparison is rejected with an explanation; the first three remain intact. Explicit removal permits a new addition.
- Empty searches recover; comparison/detail selections persist outside filters.
- Exported settings, units, source identities and artifact estimates agree with the canonical backend evaluation.
- Cancelled/slower obsolete evaluations cannot replace the newer configuration.
- Presets, filters, sort, fit-only mode, cache settings, offloading, routing, disclosures, zoom enable/reset and source links are functional.
- Failed refresh tests preserve the last valid snapshot; bounded parsing can read quantization after tokenizer arrays.

## What this evidence does not establish

No model weights were fully downloaded and no inference runtime was run. Model execution, throughput, quantization accuracy, effective long-context behavior, CPU-only/unified-memory configurations and Windows execution were **not** validated. PowerShell startup commands and VS Code tasks are provided; the executed platform was Linux. Memory estimates are planning heuristics, separately labelled from unverified runtime compatibility.

There are no benchmark quality rankings. The usability study is a plan, not a conducted study. Cloud configuration saving is separate from publishing/restoring a new cloud task; no fresh-task restoration is claimed.
