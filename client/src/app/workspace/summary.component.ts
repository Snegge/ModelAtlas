import { Component, input, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { MemoryComponent } from "../components/memory.component";
import { WorkspaceStore } from "./workspace.store";
import { Row } from "./ranking";
@Component({
  selector: "atlas-summary",
  standalone: true,
  imports: [RouterLink, MemoryComponent],
  template: `
    @let x = row();
    <div class="summary-heading">
      <a [routerLink]="['/models', x.r.id]">{{ x.r.name }}</a
      ><strong
        ><small>Score</small
        >{{ x.score === null ? "Unknown" : x.score + " / 100" }}</strong
      >
    </div>
    <p class="card-description">
      {{ x.r.publisher }} · {{ x.r.family }} language model
    </p>
    <p class="fit-label">{{ label(x.status) }}</p>
    <div class="card-memory">
      <div class="card-memory-heading">
        <span>{{
          x.e?.totalGiB === null || !x.e
            ? "Unknown memory"
            : x.e.totalGiB!.toFixed(1) + " GiB estimated"
        }}</span
        ><span>{{ free(x) }} free</span>
      </div>
      @if (x.e) {
        <atlas-memory
          [estimate]="x.e"
          [scaleGiB]="s.profile().vram"
          [compact]="true"
        />
      }
      <div class="compact-legend">
        <span><i class="weights"></i>Weights</span
        ><span><i class="cache"></i>KV cache</span
        ><span><i class="runtime"></i>Runtime</span
        ><span><i class="safety"></i>Reserve</span
        ><span><i class="free"></i>Free</span>
      </div>
      @if (!x.e || x.e.totalGiB === null) {
        <small>KV cache, runtime, reserve and free memory: unknown.</small>
      }
    </div>
    <div class="quantization-chips" role="group" aria-label="Quantization">
      @for (a of s.api.variants(x.r.id); track a.id) {
        <button
          [attr.aria-pressed]="a.id === x.a.id"
          (click)="s.variant(x.r.id, a.id)"
        >
          {{ a.quantization }}
        </button>
      }
    </div>
    <div class="card-metrics">
      <span
        ><b>{{ s.profile().context.toLocaleString() }}</b> tokens
        requested</span
      ><span
        ><b>{{ x.speed ? x.speed.low + "–" + x.speed.high : "Unknown" }}</b>
        {{ x.speed ? "tokens/s · estimated" : "speed" }}</span
      >
    </div>
    <div class="card-bottom">
      <span class="card-data-status">{{
        x.entered
          ? "Demo quality " + x.q.toFixed(0) + " · " + x.coverage + "% coverage"
          : "Demo popularity"
      }}</span>
      <div class="actions">
        @if (showCompare()) {
          <button (click)="s.toggle(x.a.id)">
            {{
              s.comparisons().includes(x.a.id)
                ? "Remove from comparison"
                : "Compare +"
            }}
          </button>
        }
        <a class="details-link" [routerLink]="['/models', x.r.id]">Details →</a>
      </div>
    </div>
    @if (showEvidence()) {
      <details class="card-evidence">
        <summary>Assumptions, breakdown & sources</summary>
        <p>
          {{ x.e?.reasons?.join(" ") }} Runtime compatibility unverified.
          Everyday usability:
          {{ x.speed ? "estimated only; test your task" : "unknown" }}.
        </p>
        <p>
          Weights {{ fmt(x.e?.weightsGiB ?? null) }} · KV cache
          {{ fmt(x.e?.cacheGiB ?? null) }} · runtime
          {{ fmt(x.e?.runtimeGiB ?? null) }} · reserve
          {{ fmt(x.e?.safetyGiB ?? null) }}. GPU
          {{ fmt(x.e?.gpuRequiredGiB ?? null) }} · separate RAM
          {{ fmt(x.e?.systemRequiredGiB ?? null) }}.
        </p>
        <p>
          Maximum context
          {{ x.r.contextLimit?.toLocaleString() ?? "unknown" }} tokens. Hardware
          fit component {{ x.fit ?? "unknown" }} / 100. Quality is synthetic
          demo data; no measured variant benchmarks.
        </p>
        <p>
          License: {{ x.r.license ?? "unknown" }} ·
          <a [href]="x.a.sourceUrl" target="_blank" rel="noreferrer"
            >Artifact source</a
          >
          · <a routerLink="/methodology" fragment="score">Score method</a> ·
          <a routerLink="/methodology" fragment="speed">Speed assumptions</a>
        </p>
      </details>
    }
  `,
})
export class SummaryComponent {
  readonly row = input.required<Row>();
  readonly showCompare = input(true);
  readonly showEvidence = input(true);
  readonly s = inject(WorkspaceStore);
  label(v: string) {
    return (
      {
        "gpu-fit": "Fits fully in VRAM (estimated)",
        offload: "Potentially usable with CPU offloading",
        "outside-budget": "Memory or context constraints exceeded",
        unknown: "Incomplete data / hardware",
      }[v] ?? v
    );
  }
  fmt(v: number | null) {
    return v === null ? "unknown" : v.toFixed(2) + " GiB";
  }
  free(x: Row) {
    return this.s.profile().vram !== null &&
      x.e?.gpuRequiredGiB !== null &&
      x.e?.gpuRequiredGiB !== undefined
      ? Math.max(0, this.s.profile().vram! - x.e.gpuRequiredGiB).toFixed(2) +
          " GiB"
      : "unknown";
  }
}
