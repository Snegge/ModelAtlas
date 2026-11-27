import { MatExpansionModule } from "@angular/material/expansion";
import { Component, inject } from "@angular/core";
import { DatePipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { AtlasStore } from "./core/atlas.store";
@Component({
  standalone: true, imports: [MatExpansionModule, RouterLink, DatePipe],
  template: `<article class="method-page" aria-labelledby="method-title">
    <header class="method-hero"><p class="eyebrow">METHOD & DATA</p>
      <h1 id="method-title">Understand the numbers.</h1>
      <p class="page-intro">A selection aid for one NVIDIA GPU, full GPU placement, llama.cpp CUDA and one simultaneous request.</p>
    </header>
    <div class="evidence-key" aria-label="Evidence types">
      <div><span class="evidence-tag">Sourced</span><h2>Files & metadata</h2><p>Pinned repositories, complete file sets and checked original-model mapping.</p></div>
      <div><span class="evidence-tag">Estimated</span><h2>Memory & speed</h2><p>Explicit planning assumptions; no local runtime measurements.</p></div>
      <div><span class="evidence-tag">Sourced quality</span><h2>Original-model quality</h2><p>Measured reference indices or attributed editorial ratings; evidence types remain visible.</p></div>
    </div>
    <div class="method-layout"><nav class="method-nav" aria-label="On this page">
      <a routerLink="/methodology" fragment="data">Sources & data</a>
      <a routerLink="/methodology" fragment="popularity">Popularity & tasks</a>
      <a routerLink="/methodology" fragment="score">Score & reference quality</a>
      <a routerLink="/methodology" fragment="memory">Memory & context</a>
      <a routerLink="/methodology" fragment="speed">Speed estimates</a>
      <a routerLink="/methodology" fragment="simulation">Chat simulation</a>
    </nav><div class="method-content">
      <section aria-labelledby="data"><h2 id="data">Sources and data status</h2>
        @if (store.coverage(); as c) {
          <p>{{ c.releaseCount }} releases · {{ c.artifactCount }} GGUF variants. Snapshot assembled {{ c.retrievedAt | date:'longDate':'UTC' }}.</p>
          <mat-expansion-panel class="evidence-panel"><mat-expansion-panel-header><mat-panel-title>Excluded candidates ({{ c.importIssues.length }})</mat-panel-title></mat-expansion-panel-header><ul>
            @for (issue of c.importIssues; track issue.repository) { <li>{{ issue.repository }}: {{ issue.reason }}</li> }
          </ul></mat-expansion-panel>
        }
        <p>Hugging Face Hub supplies pinned model configuration, GGUF file sizes and recent download counts. Only complete, supported dense-transformer releases with an exact source mapping and a documented quality input are admitted.</p>
        <p>Retained benchmark evidence comes from the public <a href="https://huggingface.co/datasets/open-llm-leaderboard/results" target="_blank" rel="noreferrer">Open LLM Leaderboard results</a>.
          That leaderboard retired in March 2025. Newer releases can instead use explicitly attributed <a href="https://willitrunai.com/why-it-works" target="_blank" rel="noreferrer">WillItRunAI quality ratings</a>. These are editorial inputs, not comparable measured benchmark results. Retrieval dates never imply evaluation dates.</p>
        <p>Every detail page distinguishes evaluation date, evidence retrieval date and original/GGUF revisions. If source revisions differ, source weight hashes must match. The evaluation's template remains the reference; converted templates can differ.</p>
      </section>
      <section aria-labelledby="popularity"><h2 id="popularity">Popularity and task evidence</h2>
        <p>Before hardware is entered, recent Hugging Face downloads order the recommendations. Downloads are a selection hint, not unique users or quality.</p>
        <p>Chat, Coding, Reasoning and Agentic filter documented intended uses from publisher cards or the linked model profile. They do not change the score or imply a measured task-specific advantage.</p>
      </section>
      <section aria-labelledby="score"><h2 id="score">Score, reference quality and ranking</h2>
        <p>The score is inspired by <a href="https://willitrunai.com/why-it-works" target="_blank" rel="noreferrer">WillItRunAI's documented compatibility formula</a>. It combines quality (45 points), full GPU fit (25), speed (15) and VRAM utilization (15). It is a selection heuristic, not a benchmark result.</p>
        <div class="score-weights" aria-label="Score weights: quality 45, GPU fit 25, speed 15, VRAM utilization 15 points"><span>45 <strong>Quality</strong></span><span>25 <strong>GPU fit</strong></span><span>15 <strong>Speed</strong></span><span>15 <strong>Util</strong></span></div>
        <p>Quality points = 0.45 × the sourced original-model rating. Fit gives 25 points up to 82% VRAM usage and 22 above it. Speed points = min(15, 2.3 × log2(estimated tokens/s + 1)). Utilization points = min(15, 15 × VRAM usage / 70%). Usage includes weights, selected-context KV, runtime and reserve. The formula rewards using available capacity as well as speed; a larger quantization can therefore win.</p>
        <p>A configuration that exceeds VRAM or the model's context limit scores 0. Missing hardware or a failed calculation remains unassessed. All variants are checked; the highest eligible composite score wins. Exact scores order recommendations, then estimated speed and stable identity break ties. Displayed scores are rounded.</p>
        <p>Some quality inputs are the retained reference index: 100 × (0.5 × IFEval + 0.5 × MMLU-Pro). IFEval v2 uses strict instruction accuracy, zero shots and deterministic generation capped at 1,280 tokens; MMLU-Pro v0.1 uses accuracy and five shots. Both use FP16/BF16 original weights and the pinned evaluation policy. Missing tests are never replaced or reweighted.</p>
        <p>Other inputs are WillItRunAI's attributed editorial quality ratings for the exact original checkpoint. They have no claimed evaluation date or shared testing protocol. Mixing these sources broadens coverage but limits cross-model comparability. The detail page identifies the basis, source and date checked. Task tags are filters, not task scores. No quantization quality penalty is invented.</p>
      </section>
      <section aria-labelledby="memory"><h2 id="memory">Memory and context</h2>
        <p>Weights = total GGUF file bytes. F16 KV bytes = 4 × layers × KV heads × head dimension × selected context tokens.
          Runtime allowance = 0.75 GiB + 5% of weights. Reserve = 10% of weights + KV cache + runtime.</p>
        <p>The entire total must fit the available GPU budget. The selected context is used throughout; 1K means 1,024 tokens. GPU VRAM and bandwidth come from the selected NVIDIA desktop card. Optional system RAM only supplies a host-memory planning hint (a weight copy plus 4 GiB for the OS); mmap can use less. RAM never adds GPU capacity or enables CPU offloading. Sliding/local attention uses a conservative full-context upper bound. Runtime buffers vary with build and settings; a fit estimate is not a launch guarantee.</p>
      </section>
      <section aria-labelledby="speed"><h2 id="speed">Estimated generation speed</h2>
        <p>Bandwidth roofline = GPU memory bandwidth in bytes/s ÷ (weight bytes + full selected-context KV bytes).
          Typical estimate = 70% of that roofline × quantization throughput factor (Q4_K_M 1.08, Q5_K_M 1.01, Q8_0 0.90). Efficiency and factors follow WillItRunAI; selected-context KV traffic is additionally included here. The main display shows rounded estimated tokens/s. Details expose a 50–85% sensitivity range, rounded outward.</p>
        <p>This is an uncalibrated heuristic range, not a statistical confidence interval or guaranteed lower bound. It estimates decoding at a fully occupied context; prompt processing, time to first token and reasoning-token overhead are excluded.</p>
        <p>A speed estimate is only meaningful for a configuration that fits fully in GPU memory and respects the model's context limit. Otherwise the display states the constraint. An unselected GPU, pending calculations and failed requests have distinct messages; a slow but executable model still shows its estimated speed.</p>
        <p>Public <a href="https://github.com/ggml-org/llama.cpp/discussions/15013" target="_blank" rel="noreferrer">llama.cpp CUDA measurements</a> provide a plausibility check, but mostly use short-context Llama 2 Q4_0. They do not calibrate the catalog's K-quants, architectures or long contexts. Small models can be compute/launch limited and overestimated.</p>
      </section>
      <section aria-labelledby="simulation"><h2 id="simulation">Chat simulation</h2><p>The prepared response demonstrates approximate streaming. It does not run a model or test answer quality. When no speed estimate is available, the reason is shown and simulation requires the explicit demo-rate option.</p></section>
    </div></div>
  </article>`,
})
export class MethodologyComponent { readonly store = inject(AtlasStore); }
