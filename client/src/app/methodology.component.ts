import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<article class="method-page surface">
    <a routerLink="/">← Explorer</a>
    <h1>Method, data & limits</h1>
    <p>
      Model Atlas is a selection aid. Run your own prompts and evaluate
      correctness, latency and runtime support before adopting a model.
    </p>
    <h2 id="data">Sources and data status</h2>
    <p>
      The bundled revision-pinned Hugging Face catalog contains 38 releases and
      114 GGUF variants, retrieved October 11, 2026. Model and artifact source
      links, license and individual retrieval dates appear on detail pages.
      Existing catalog API and importer remain available. The app makes no live
      model-service requests.
    </p>
    <p>
      Measured means an observed result with conditions. Estimated means a
      calculation with stated assumptions. Demo means synthetic interaction
      data. Unknown means absent or unsupported. No measured quality or speed
      benchmarks exist in this catalog.
    </p>
    <h2 id="popularity">Popularity and task categories</h2>
    <p>
      Popular models use a deterministic synthetic popularity ordering, not
      downloads or a current ranking. Coding, Writing, Reasoning and Agentic use
      synthetic release-level quality fixtures on 0–100. Every release has these
      demo categories; this is not an evidence-based capability classification.
      All tasks averages the four values equally. Fixtures live in
      workspace/ranking.ts and can be replaced by sourced measurements.
      Basemodel benchmarks are not claimed for quantized artifacts; the demo
      value is shared across variants solely to demonstrate interactions.
    </p>
    <h2 id="score">Prototype score</h2>
    <p>
      Weights: quality 50%, speed 25%, hardware fit 25%. Quality is currently a
      demo fixture. Speed component = min(100, range midpoint / 50 tokens/s ×
      100). Fit = 100 for full GPU fit, 55 for offloading, 0 outside
      constraints, unknown otherwise. Score is the rounded weighted average of
      available components; missing components are omitted and weights
      renormalized. Coverage shows their original weight sum. A score requires
      known fit and at least 50% coverage. Missing data is never silently zero.
    </p>
    <p>
      Only full GPU fits and possible offloading candidates can enter the Top 5.
      Unassessable and incompatible variants remain in the catalog. Ties use
      stable release IDs. Normalization uses fixed scales, independent of
      search. Recommendations always use All tasks, independent of the catalog
      task filter. Search and table sorting never change recommendations. The
      selected variant per release participates in ranking. The score is an
      unvalidated prototype heuristic; demo quality is not evidence of
      superiority.
    </p>
    <h2 id="memory">Memory, context and offloading</h2>
    <p>
      The existing dedicated-gpu/1.0.0 backend evaluates conventional supported
      transformers. GGUF file bytes approximate weights. F16 KV cache = 2 ×
      layers × KV heads × head dimension × requested tokens × 2 bytes, with one
      sequence. Runtime overhead = 0.75 GiB + 5% of weights. Reserve = 10% of
      weights + cache + runtime. Full cache is a conservative upper bound for
      sliding attention. Requested context cannot exceed the documented maximum.
    </p>
    <p>
      RAM and VRAM are separate. Without offloading all estimated GPU memory
      must fit VRAM. Offloading keeps cache, overhead and reserve on GPU and
      moves excess weights into RAM, with a further 2 GiB host reserve. GPU and
      host requirements are shown independently. Free VRAM is budget minus GPU
      requirement, floored at zero. The segmented bar shows weights, cache,
      runtime and reserve against the larger of budget and total; its unused
      background is free budget only for full GPU placement.
    </p>
    <p>
      CPU-only, unsupported architectures and missing metadata remain
      unassessable. MoE is not approximated by active parameters. Memory fit
      does not establish runtime support or everyday usefulness. Profile GPU
      capacities are entered in GiB for the estimator; vendor GB labels denote
      nominal device capacities. RTX 3060 12 GB: 360 GB/s; RTX 3090 24 GB: 936
      GB/s. Official NVIDIA profile links are listed in ranking.ts; manual
      overrides remain effective until a GPU change.
    </p>
    <h2 id="speed">Speed assumptions</h2>
    <p>
      For full GPU fit with known bandwidth, a rough bandwidth bound is GPU GB/s
      × 10⁹ / ((weight GiB + cache GiB) × 2³⁰). Displayed range is 10–35% of
      this bound, rounded down. These utilization factors are unvalidated
      prototype assumptions, not measured performance or confidence intervals.
      Actual generation depends on kernels, runtime, quantization and context.
      Offloading and CPU-only have unknown speed because CPU and host-memory
      bandwidth are missing. No precise offload prediction is made.
    </p>
    <p>
      The plot shows speed midpoint versus demo task quality; missing speed is
      omitted, never plotted as zero. Its speed axis is linear and clamped at
      200 tokens/s; values above 200 are at the boundary and the accessible
      point label retains the actual range. All views share one result layer.
    </p>
    <h2 id="simulation">Chat simulation</h2>
    <p>
      A prepared response advances every 100 ms using the speed captured at
      Start. Characters / 4 approximate tokens; this is not a tokenizer. Unknown
      speed requires an explicit 12-token/s demo opt-in. Stop and Reset cancel
      the timer; leaving the page also cancels it. Prompts do not trigger
      inference.
    </p>
    <h2>Roadmap</h2>
    <p>
      Learning, models of the week, forum, ratings and reviews are deferred.
      Future work: sourced task benchmarks with conditions, measured
      runtime-specific throughput and CPU-only estimation.
    </p>
  </article>`,
})
export class MethodologyComponent {}
