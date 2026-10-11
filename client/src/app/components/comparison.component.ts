import { Component, computed, inject } from "@angular/core";
import { AtlasStore } from "../core/atlas.store";
import { MemoryComponent } from "./memory.component";
@Component({
  selector: "atlas-comparison",
  standalone: true,
  imports: [MemoryComponent],
  template: `
    <section
      id="artifact-comparison"
      class="comparison-panel"
      aria-labelledby="comparison-heading"
    >
      <div class="panel-heading">
        <div>
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
      @if (!s.catalog()) {
        <p class="comparison-empty" role="status">
          {{
            s.loading()
              ? "Loading saved artifacts…"
              : "Load the catalog to compare saved artifacts."
          }}
        </p>
      } @else if (s.comparisons().length) {
        <div class="comparison-key">
          <span>Shared scale {{ scale().toFixed(1) }} GiB</span>
          <span><i class="weights"></i>Weights</span
          ><span><i class="cache"></i>KV cache</span>
          <span><i class="runtime"></i>Runtime</span
          ><span><i class="safety"></i>Safety</span>
        </div>
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
                  [compact]="true"
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
              }
              <details class="comparison-more">
                <summary>
                  {{
                    e?.scenario?.totalGiB === null
                      ? "Why unknown & source"
                      : "Breakdown & source"
                  }}
                </summary>
                @if (e && e.scenario.totalGiB !== null) {
                  <dl class="memory-legend">
                    <div>
                      <dt>Weights</dt>
                      <dd>{{ e.scenario.weightsGiB!.toFixed(2) }} GiB</dd>
                    </div>
                    <div>
                      <dt>KV cache</dt>
                      <dd>{{ e.scenario.cacheGiB!.toFixed(2) }} GiB</dd>
                    </div>
                    <div>
                      <dt>Runtime</dt>
                      <dd>{{ e.scenario.runtimeGiB!.toFixed(2) }} GiB</dd>
                    </div>
                    <div>
                      <dt>Safety</dt>
                      <dd>{{ e.scenario.safetyGiB!.toFixed(2) }} GiB</dd>
                    </div>
                  </dl>
                }
                @if (e) {
                  <p class="small muted">{{ e.scenario.reasons[0] }}</p>
                }
                <p class="small muted">
                  One exact file set, evaluated under the live settings and
                  optional baseline. Overview quantization changes preserve this
                  selection.
                </p>
                <a
                  [href]="a.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  >Artifact source ↗</a
                >
              </details>
            </article>
          }
        </div>
      } @else {
        <p class="comparison-empty">
          Add up to three artifacts from details or the catalog.
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
