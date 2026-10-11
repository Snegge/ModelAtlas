import { Component, computed, inject } from "@angular/core";
import { AtlasStore } from "../core/atlas.store";
import { MemoryComponent } from "./memory.component";
@Component({
  selector: "atlas-comparison",
  standalone: true,
  imports: [MemoryComponent],
  template: `
    <section class="comparison-panel" aria-labelledby="comparison-heading">
      <div class="panel-heading">
        <div>
          <div class="section-kicker">KEPT IN VIEW / EXACT SELECTIONS</div>
          <h2 id="comparison-heading">
            Compare artifacts
            <span class="count-pill">{{ s.comparisons().length }} / 3</span>
          </h2>
        </div>
        @if (s.comparisons().length) {
          <button class="text-button" (click)="s.comparisons.set([])">
            Clear comparison
          </button>
        }
      </div>
      @if (s.comparisons().length) {
        <p class="small muted">
          Each column uses one exact file set. Baseline and scenario bars
          evaluate that same artifact, independent of overview quantization
          changes. Bars share a {{ scale().toFixed(1) }} GiB scale across
          compared artifacts.
        </p>
        <div class="comparison-grid">
          @for (id of s.comparisons(); track id) {
            @let a = s.artifact(id)!;@let r = s.release(a.releaseId)!;
            @let e = s.estimate(id);
            <article class="comparison-item">
              <div class="comparison-title">
                <button class="model-select" (click)="s.focusArtifact(id)">
                  {{ r.name }}</button
                ><button
                  class="remove-button"
                  (click)="s.toggleCompare(id)"
                  [attr.aria-label]="
                    'Remove ' +
                    r.name +
                    ' ' +
                    a.quantization +
                    ' from comparison'
                  "
                >
                  ×
                </button>
              </div>
              <span class="quant-tag">{{ a.quantization }}</span
              ><span class="small muted">
                · {{ (a.sizeBytes / 1073741824).toFixed(2) }} GiB files</span
              >
              @if (s.isOutside(id)) {
                <p class="outside-filter small">
                  Outside current filters · retained
                </p>
              }
              @if (e) {
                <atlas-memory
                  [estimate]="e.scenario"
                  [baseline]="e.baseline"
                  [scaleGiB]="scale()"
                />
                @if (
                  e.baseline &&
                  e.scenario.totalGiB !== null &&
                  e.baseline.totalGiB !== null
                ) {
                  <p class="comparison-delta">
                    {{ e.scenario.totalGiB - e.baseline.totalGiB > 0 ? "+" : ""
                    }}{{
                      (e.scenario.totalGiB - e.baseline.totalGiB).toFixed(2)
                    }}
                    GiB from baseline
                  </p>
                }
                <p class="small muted">{{ e.scenario.reasons[0] }}</p>
              }
              <a [href]="a.sourceUrl" target="_blank" rel="noopener noreferrer"
                >Artifact source ↗</a
              >
            </article>
          }
        </div>
      } @else {
        <p class="comparison-empty">
          Keep up to three exact artifacts here using <b>+</b> in the catalog or
          the detail panel. Your choices remain visible when filters change.
        </p>
      }
    </section>
  `,
})
export class ComparisonComponent {
  readonly s = inject(AtlasStore);
  readonly scale = computed(() =>
    Math.max(
      1,
      ...this.s.comparisons().flatMap((id) => {
        const e = this.s.estimate(id);
        return [e?.scenario.totalGiB ?? 0, e?.baseline?.totalGiB ?? 0];
      }),
    ),
  );
}
