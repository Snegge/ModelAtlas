import { MatTooltipModule } from "@angular/material/tooltip";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { FavouriteButtonComponent } from "./favourite-button.component";
import { Component, input, inject, output } from "@angular/core";
import { RouterLink } from "@angular/router";
import { MemoryComponent } from "../components/memory.component";
import { WorkspaceStore } from "./workspace.store";
import { Row, contextK, SCORE_HINT } from "./ranking";
@Component({
  selector: "atlas-summary",
  standalone: true,
  imports: [MatTooltipModule, MatExpansionModule, MatButtonModule, MatIconModule, FavouriteButtonComponent, RouterLink, MemoryComponent],
  template: `
    @let x = row();
    <div class="summary-heading">
      <a [routerLink]="['/models', x.r.id]" (click)="s.variant(x.r.id, x.a.id)">{{ x.r.name }}</a
      ><strong tabindex="0" [matTooltip]="scoreHint"
        ><small>Score</small
        >{{ x.scoreText }}</strong
      >
    </div>
    <p class="card-description">
      {{ x.r.publisher }} · {{ x.r.family }} language model
    </p>
    @if (!compact()) { <p class="fit-label">{{ x.assessmentMessage }}</p> }
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
    @if (showVariants()) {
    <div class="quantization-chips" role="group" aria-label="Quantization">
      @for (a of s.api.variants(x.r.id); track a.id) {
        <button mat-stroked-button
          [attr.aria-pressed]="a.id === x.a.id"
          (click)="s.variant(x.r.id, a.id)"
        >
          {{ a.quantization }}
        </button>
      }
    </div>
    } @else {
      <p class="saved-variant">Saved variant <strong>{{ x.a.quantization }}</strong></p>
    }
    <div class="card-metrics">
      <span
        ><b>{{ contextK(s.profile().context) }}</b> tokens
        requested</span
      ><span
        ><b>{{ x.speedText }}</b>
        {{ x.speed ? "tokens/s · estimated" : "" }}</span
      >
    </div>
    @if (!compact()) {
      @if (x.e?.ramAdvice; as advice) { <p class="small">{{ advice }}</p> }
    }
    <div class="card-bottom">
      <span class="card-data-status">Quality input ({{ x.r.qualityRating.basis === 'external-curated' ? 'curated' : 'benchmark' }}): {{ x.r.qualityRating.score.toFixed(0) }} / 100</span>
      @if (showFavourite() || showDetails()) {
        <div class="actions">
          @if (showFavourite()) {
            <atlas-favourite-button [row]="x" (removed)="removed.emit($event)" />
          }
          @if (showDetails()) {
            <a mat-flat-button class="details-link" [routerLink]="['/models', x.r.id]" (click)="s.variant(x.r.id, x.a.id)"
              >Details <mat-icon iconPositionEnd fontIcon="arrow_forward"></mat-icon></a
            >
          }
        </div>
      }
    </div>
    @if (showEvidence()) {
      <mat-expansion-panel class="card-evidence evidence-panel">
        <mat-expansion-panel-header><mat-panel-title>Assumptions, breakdown & sources</mat-panel-title></mat-expansion-panel-header>
        @if (x.e?.scoreBreakdown; as parts) { <p>Score points: quality {{ parts.quality.toFixed(1) }} / 45 · fit {{ parts.fit }} / 25 · speed {{ parts.speed.toFixed(1) }} / 15 · utilization {{ parts.utilization.toFixed(1) }} / 15.</p> }
        @if (x.speed) { <p>Estimated typical speed {{ x.speedText }} tokens/s. Heuristic sensitivity range {{ x.speed.low }}–{{ x.speed.high }} tokens/s; not a confidence interval.</p> }
        <a [href]="x.r.qualityRating.sourceUrl" target="_blank" rel="noopener noreferrer">Original-model quality source</a>
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
          {{ fmt(x.e?.gpuRequiredGiB ?? null) }}.
        </p>
        <p>
          Maximum context
          {{ contextK(x.r.contextLimit) }}. {{ x.r.qualityRating.note }} No measured quantization adjustment.
        </p>
        <p>
          License: {{ x.r.license ?? "unknown" }} ·
          <a [href]="x.a.sourceUrl" target="_blank" rel="noreferrer"
            >Artifact source</a
          >
          · <a routerLink="/methodology" fragment="score">Score method</a> ·
          <a routerLink="/methodology" fragment="speed">Speed assumptions</a>
        </p>
      </mat-expansion-panel>
    }
  `,
})
export class SummaryComponent {
  readonly scoreHint = SCORE_HINT;
  readonly contextK = contextK;
  readonly row = input.required<Row>();
  readonly compact = input(false);
  readonly showVariants = input(true);
  readonly removed = output<Event>();
  readonly showFavourite = input(true);
  readonly showDetails = input(true);
  readonly showEvidence = input(true);
  readonly s = inject(WorkspaceStore);
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
