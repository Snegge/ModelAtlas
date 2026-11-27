# Catalog, suitability and GPU estimates

Updated 2026-11-27. This policy replaces the earlier requirement that every release have the same historical benchmark pair. The user requested broader coverage and WillItRunAI-style scoring while retaining full GPU placement.

The published snapshot contains **44 releases, 132 GGUF variants and 9 families**, up from 29/87/8. Families: DeepSeek 5, Falcon 2, Gemma 3, Granite 2, Llama 3, Mistral 3, Phi 4, Qwen 18, SmolLM 4. New coverage includes Qwen3 dense models, Qwen2.5-Coder sizes, Phi-4 mini/reasoning, Granite 4.2 and Devstral Small 2507. Quantizations remain variants, not separate releases.

## Sources and admission

Hugging Face supplies exact original checkpoints, revision-pinned configurations, GGUF manifests, complete file sizes, recent downloads and bounded header metadata. The free read token stays server-side. Each conversion must declare a single original model; canonical Hub identity and GGUF dimensions must match. Converter declarations corroborated by headers are not cryptographic proof of the quantized tensor lineage. No complete weights or inference benchmarks are downloaded/run.

Every visible release requires complete dense-transformer architecture inputs, context limit, license, a qualified GGUF variant and a sourced quality input. Hybrid/recurrent and MoE execution remains unsupported. Sliding/local attention uses a conservative full-context allocation. Runtime compatibility is modeled, not locally tested.

The exact checkpoint profiles in [model-profiles.json](../data/model-profiles.json) contain manually reviewed public WillItRunAI quality ratings, task tags, source links and dates checked. A similar display name is insufficient: for example the site's Qwen3-4B page links to Instruct-2507, not the earlier checkpoint. A conflicting OLMo size/link and Ministral BF16 identity differences prevent copying their ratings into unmatched releases. No background scraper bypasses TLS checks or site restrictions. Automated refresh reuses these reviewed profiles; adding/updating an editorial rating requires review of its exact linked checkpoint.

[reference-evaluations.json](../data/reference-evaluations.json) preserves the earlier pinned HF evidence. It is reused only for the same original revision or matching hashes of all original weight shards. Both IFEval v2 (strict instruction accuracy, 0-shot) and MMLU-Pro v0.1 (accuracy, 5-shot) must match [benchmark-policy.json](../data/benchmark-policy.json). Reference index = 50 × (IFEval + MMLU-Pro), with both raw values on 0–1. No substituted tests, missing-test reweighting or invented quantization penalties are used. The leaderboard retired in March 2025; retrieval is not evaluation time.

There are 27 benchmark-based quality inputs and 17 editorial inputs; historical benchmark evidence remains available on 29 releases. An editorial rating is not a measured benchmark and is not strictly comparable with a reference index. Details and exports identify the basis and original-model source. This tradeoff broadens coverage, but the combined ranking should be treated as an exploration aid.

Chat, Coding, Reasoning and Agentic are documented intended-use tags from publisher/model profiles. Filtering does not invent task-specific scores or change the rating. Agentic coverage is currently narrow (Devstral Small 2507).

The snapshot records 62 source/release exclusion entries (not 62 distinct models): 32 lack an exact reviewed quality input; 10 use unsupported architectures; 14 lack quantization metadata inside the bounded GGUF header; 5 lack an unambiguous declared base; 1 source is unavailable. The Method page lists individual reasons. Metadata failure never becomes a fabricated score. Modern hybrid/MoE families remain outside the supported estimator.

Sources: [WillItRunAI methodology](https://willitrunai.com/why-it-works), per-model URLs in the profiles, [HF Hub API](https://huggingface.co/docs/hub/api), [HF detailed evaluations](https://huggingface.co/datasets/open-llm-leaderboard/results), [GGUF specification](https://github.com/ggml-org/ggml/blob/master/docs/gguf.md), [NVIDIA GPU specifications](https://www.nvidia.com/en-us/geforce/graphics-cards/compare/).

## Score, memory and generation speed

Scope: one NVIDIA GPU, llama.cpp CUDA, one request, F16 KV cache, full GPU residency. 1K = 1,024 tokens; the same selected context is used in both memory and speed calculations.

- Weights = actual total GGUF bytes.
- KV bytes = 4 × layers × KV heads × head dimension × selected context.
- Runtime = 0.75 GiB + 5% of weights. Reserve = 10% of weights + KV + runtime.
- The complete total must fit VRAM and context must respect the original limit. Otherwise suitability = 0 and speed states the failing constraint. Missing selection/calculation remains unassessed, with loading/error/retry states.
- Typical decode tokens/s = 0.70 × bandwidth bytes/s ÷ (weight bytes + full-context KV bytes) × quantization factor. Factors: Q4_K_M 1.08, Q5_K_M 1.01, Q8_0 0.90. Main display is rounded and explicitly estimated. Details show a 50–85% sensitivity band, not a statistical confidence interval.
- Score = quality 0.45 × rating + fit (25 points at utilization ≤82%, otherwise 22) + min(15, 2.3 × log2(typical speed + 1)) + min(15, utilization / 0.70 × 15). Utilization uses the entire required GPU memory, including reserve. Quality is unchanged across quantizations; only speed and memory affect their suitability.

This follows WillItRunAI's documented 45/25/15/15 compatibility structure and discrete-GPU efficiency/quant factors, with explicit context traffic and a hard full-GPU gate. It does not copy every workload recommendation rule. The utilization component can prefer a larger quantization. All variants are evaluated; exact composite score, then speed, then stable identity order eligible recommendations. Rounded scores are presentation only. The API retains an optional conservative minimum-speed constraint for existing callers; the streamlined workspace uses zero and lets the speed component influence ranking.

The speed factors remain uncalibrated for these exact GPU/model/context combinations. Public llama.cpp CUDA measurements mainly cover different quantizations or short contexts; they do not establish an error distribution. Compute/launch limits can cause large overestimates for small models; prompt ingestion, first-token latency and reasoning overhead are excluded. No claim of measured accuracy is made.

The GPU picker contains 30 distinct NVIDIA RTX 30/40/50 desktop memory variants. VRAM and reference bandwidth are read-only sourced values. Laptop, AMD, Apple and multiple-GPU systems are excluded. Optional RAM only adds a host-memory planning hint (full weight copy + 4 GiB OS); mmap may need less. RAM never changes VRAM fit, estimated speed or score. Saved known GPUs regain their canonical specifications; arbitrary legacy overrides are discarded, favourites remain.

The VRAM table column shows total required GiB and a utilization bar, capped visually at 100% while the text reports overflow. Tables scroll with the page and reflow at narrow widths; main navigation stays sticky. Quality source and speed breakdown remain available in Details. CSV exports retain raw token counts for machine use and distinguish quality basis, source-check time, evaluation time and typical/sensitivity speed.

## Refresh and local configuration

Run from the project root with Python 3.10+ (standard library only):

```powershell
# Manual update; the existing importer entry point now always applies qualification.
py -3 scripts/import_catalog.py

# Regular update every 24 hours; leave this server-side process running.
py -3 scripts/import_catalog.py --watch

# Import/admission/security tests, without network or weights.
py -3 -m unittest discover -s scripts -p "test_*.py"
```

Linux/macOS use `python3`. A system scheduler may invoke the same manual command daily; no service, database or paid API is introduced. No OS scheduled task is installed automatically. The previous `--extend`, `--workers` and minimum-model-count switches are removed because every publication must pass the same complete validation.

JSON responses are cached for 24 hours under ignored `.cache/catalog/`; pinned GGUF header metadata is reused by exact repository/revision/file. Upstream 429/5xx receive bounded retries. The retained benchmark acquisition helper follows registry pagination; routine refresh now uses reviewed pinned evaluation records. Only small metadata and bounded GGUF header ranges are fetched; ignored Range responses are rejected before reading a body. Credentials and authorization headers are never written to this cache or logs, and authorization is stripped on redirects.

The importer reads the same local secret as the existing server probe:

```text
Windows: %APPDATA%\Microsoft\UserSecrets\ModelAtlas-HuggingFace-local\secrets.json
Linux/macOS: ~/.microsoft/usersecrets/ModelAtlas-HuggingFace-local/secrets.json
Key: HuggingFace:Token
Alternative environment variable: HuggingFace__Token
```

Only a free read token is needed. Existing credentials are reused; no token needs to enter Angular or a tracked configuration. See [HF setup and connection probes](HUGGING-FACE.md). Original repositories may separately require accepting their access conditions; usable public GGUF metadata can avoid needing their protected config. HTTP 401/403, missing fields, missing result revisions and 429/network failures are distinguished. No subscription upgrade is attempted or required.

Every candidate is validated before a temporary file atomically replaces `data/catalog.json`. A failed run, empty catalog or loss of a previously qualified release retains the previous valid file. `.cache/catalog/last-attempt.json` records the attempted count and exclusions for investigation. A network/rate-limit failure is not converted into a zero score or a silent exclusion. Correcting a permanent exclusion policy requires an explicit reviewed catalog change; routine refresh does not silently shrink coverage.

During normal `dotnet run --project server/ModelAtlas.Api` development, the API reads the repository catalog and checks changed timestamps on subsequent requests. Invalid replacements retain the in-memory last valid snapshot and expose `refreshError` at `/api/catalog/status`. Existing running binaries must be restarted once after this code change. Published deployments default to their bundled `Data/catalog.json`; set server-side `Catalog__Path` to an absolute path if the importer writes to a different shared location. Reloading the browser fetches the new catalog.

Concurrent manual/scheduled writers are blocked by `.cache/catalog/refresh.lock`. After a hard process termination, remove that single stale lock file only after checking that no importer is running. Normal exit and failures release the lock automatically.

`data/catalog.json.importIssues` and the Method page list exclusions. `data/candidate-research.json` preserves additional current-release research and its separate retrieval date. Evaluation dates remain historical and are never overwritten with the latest import date.

## Verification

See [validation record](VALIDATION.md) for the current checks. Tests cover complete publication, source mapping, atomic refresh, context/VRAM boundaries, composite scoring, RAM isolation, variant choice, persistence, GPU search, task filters, accessibility and page scrolling. The Angular production build is required. No inference measurements or OS scheduled task installation are part of this change.
