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
      ><strong>{{
        x.score === null ? "Score unknown" : x.score + " / 100"
      }}</strong>
    </div>
    <p class="muted">
      {{ x.r.publisher }} · {{ x.r.family }} language model ·
      {{ x.a.quantization }}
    </p>
    <p class="status-pill">{{ label(x.status) }}</p>
    <p>
      {{
        x.entered
          ? "Quality " +
            x.q.toFixed(0) +
            " (demo) · fit " +
            (x.fit === null ? "unknown" : x.fit + "/100") +
            " · coverage " +
            x.coverage +
            "%"
          : "Demo popularity · synthetic ordering, not a live ranking"
      }}
    </p>
    <label
      >Quantization
      <select
        [value]="x.a.id"
        (change)="s.variant(x.r.id, $any($event.target).value)"
      >
        @for (a of s.api.variants(x.r.id); track a.id) {
          <option [value]="a.id">{{ a.quantization }}</option>
        }
      </select></label
    >
    <p>
      {{ s.profile().context.toLocaleString() }} tokens requested · max
      {{ x.r.contextLimit?.toLocaleString() ?? "unknown" }}
    </p>
    <p>
      <a routerLink="/methodology" fragment="speed">Speed</a>:
      {{
        x.speed
          ? x.speed.low + "–" + x.speed.high + " tokens/s · rough estimate"
          : "Unknown · no reliable speed prediction"
      }}
    </p>
    @if (x.e) {
      <atlas-memory [estimate]="x.e" [scaleGiB]="s.profile().vram" />
      <p class="small">
        GPU requirement {{ fmt(x.e.gpuRequiredGiB) }} · separate RAM
        {{ fmt(x.e.systemRequiredGiB) }} · free GPU {{ free(x) }}. All
        estimates.
      </p>
    }
    @if (!x.e || x.e.totalGiB === null) {
      <p>KV cache, runtime, reserve and free memory: unknown.</p>
    }
    <p class="small">
      {{ x.e?.reasons?.join(" ") }} Runtime compatibility unverified. Everyday
      usability: {{ x.speed ? "estimated only; test your task" : "unknown" }}.
    </p>
    <div class="actions">
      <a [routerLink]="['/models', x.r.id]">Details →</a
      ><button (click)="s.toggle(x.a.id)">
        {{
          s.comparisons().includes(x.a.id)
            ? "Remove from comparison"
            : "Compare +"
        }}
      </button>
    </div>
    <p class="small">
      License: {{ x.r.license ?? "unknown" }} ·
      <a [href]="x.a.sourceUrl" target="_blank" rel="noreferrer"
        >Artifact source</a
      >
      · <a routerLink="/methodology" fragment="score">Score method</a>
    </p>
  `,
})
export class SummaryComponent {
  readonly row = input.required<Row>();
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
