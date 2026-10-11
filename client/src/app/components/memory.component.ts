import { Component, computed, input } from "@angular/core";
import { Estimate, STATUS_LABEL } from "../core/models";
@Component({
  selector: "atlas-memory",
  standalone: true,
  template: `
    <div class="memory-viz" aria-label="Estimated memory breakdown">
      @for (row of rows(); track row.name) {
        <div class="memory-row">
          <div class="memory-row-title">
            <span>{{ row.name }} · same artifact</span
            ><strong>{{
              row.e.totalGiB === null
                ? "Unknown"
                : row.e.totalGiB!.toFixed(2) + " GiB"
            }}</strong>
          </div>
          @if (row.e.totalGiB !== null) {
            <div
              class="memory-track"
              role="img"
              tabindex="0"
              [attr.aria-label]="describe(row.e)"
            >
              <span
                class="memory-segment weights"
                [style.width.%]="width(row.e.weightsGiB)"
                [attr.title]="'Weights: ' + format(row.e.weightsGiB)"
              ></span
              ><span
                class="memory-segment cache"
                [style.width.%]="width(row.e.cacheGiB)"
                [attr.title]="'KV cache: ' + format(row.e.cacheGiB)"
              ></span
              ><span
                class="memory-segment runtime"
                [style.width.%]="width(row.e.runtimeGiB)"
                [attr.title]="'Runtime: ' + format(row.e.runtimeGiB)"
              ></span
              ><span
                class="memory-segment safety"
                [style.width.%]="width(row.e.safetyGiB)"
                [attr.title]="'Safety: ' + format(row.e.safetyGiB)"
              ></span>
            </div>
          }
          <span class="small muted">{{ label[row.e.status] }}</span>
        </div>
      }
      @if (estimate().totalGiB !== null) {
        <dl class="memory-legend">
          <div>
            <dt><i class="weights"></i>Weights</dt>
            <dd>{{ format(estimate().weightsGiB) }}</dd>
          </div>
          <div>
            <dt><i class="cache"></i>KV cache</dt>
            <dd>{{ format(estimate().cacheGiB) }}</dd>
          </div>
          <div>
            <dt><i class="runtime"></i>Runtime</dt>
            <dd>{{ format(estimate().runtimeGiB) }}</dd>
          </div>
          <div>
            <dt><i class="safety"></i>Safety</dt>
            <dd>{{ format(estimate().safetyGiB) }}</dd>
          </div>
        </dl>
      }
    </div>
  `,
})
export class MemoryComponent {
  readonly estimate = input.required<Estimate>();
  readonly baseline = input<Estimate | null>(null);
  readonly scaleGiB = input<number | null>(null);
  readonly label = STATUS_LABEL;
  readonly rows = computed(() => [
    ...(this.baseline() ? [{ name: "Baseline", e: this.baseline()! }] : []),
    { name: "Scenario", e: this.estimate() },
  ]);
  readonly max = computed(() =>
    Math.max(
      this.scaleGiB() ?? 0,
      this.estimate().totalGiB ?? 1,
      this.baseline()?.totalGiB ?? 1,
      1,
    ),
  );
  width(v: number | null) {
    return ((v ?? 0) / this.max()) * 100;
  }
  format(v: number | null) {
    return v === null ? "Unknown" : v.toFixed(2) + " GiB";
  }
  describe(e: Estimate) {
    return `Weights ${this.format(e.weightsGiB)}, KV cache ${this.format(e.cacheGiB)}, runtime ${this.format(e.runtimeGiB)}, safety ${this.format(e.safetyGiB)}. Total ${this.format(e.totalGiB)}.`;
  }
}
