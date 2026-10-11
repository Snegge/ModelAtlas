import { Component, inject } from "@angular/core";
import { AtlasStore } from "./core/atlas.store";
import { HardwareComponent } from "./components/hardware.component";
import { ChartComponent } from "./components/chart.component";
import { CatalogComponent } from "./components/catalog.component";
import { DetailComponent } from "./components/detail.component";
import { ComparisonComponent } from "./components/comparison.component";
@Component({
  selector: "atlas-explorer",
  standalone: true,
  imports: [
    HardwareComponent,
    ChartComponent,
    CatalogComponent,
    DetailComponent,
    ComparisonComponent,
  ],
  template: `
    <h1 class="sr-only">Model Atlas workspace</h1>
    @if (s.error()) {
      <div class="error-banner" role="alert">
        <div>
          <strong>Connection needs attention</strong>
          <p>{{ s.error() }}</p>
        </div>
        <button class="button" (click)="s.retry()">
          Retry catalog & evaluation
        </button>
      </div>
    }
    @if (s.loading()) {
      <div class="loading-state" role="status">
        <span class="loading-ring"></span>Loading the bundled, revision-pinned
        catalog…
      </div>
    }
    <div class="workspace-grid">
      <atlas-hardware />
      <div class="exploration-column">
        @if (s.baseline(); as b) {
          <section class="baseline-strip" aria-labelledby="baseline-heading">
            <div class="baseline-top">
              <div>
                <div class="section-kicker" id="baseline-heading">
                  FIXED REFERENCE → LIVE SETTINGS
                </div>
                <div class="baseline-values">
                  <b>{{ b.gpuGiB }} GiB GPU</b
                  ><span>· {{ b.ramGiB }} GiB RAM</span
                  ><span>· {{ b.contextTokens.toLocaleString() }} tokens</span
                  ><span>· {{ b.quantization }}</span
                  ><span
                    >· {{ b.cachePrecision.toUpperCase() }} ×
                    {{ b.concurrency }}</span
                  ><span>· Offload {{ b.allowOffload ? "on" : "off" }}</span>
                </div>
              </div>
              <div class="baseline-actions">
                <button class="button small-button" (click)="s.restore()">
                  Restore baseline</button
                ><button class="text-button" (click)="s.clearBaseline()">
                  Clear baseline
                </button>
              </div>
            </div>
            <div class="scenario-outcomes" [attr.aria-busy]="!s.current()">
              <span
                ><b class="gained">+{{ s.changes().gained }}</b> become
                feasible</span
              ><span
                ><b class="lost">−{{ s.changes().lost }}</b> become
                infeasible</span
              ><span
                ><b>{{ s.changes().uncertain }}</b> remain uncertain</span
              ><span
                ><b>{{ s.changes().switched }}</b> representative changes</span
              >
            </div>
            <p class="tiny muted">
              The baseline stays fixed as you adjust the live settings. Across
              the full catalog, feasible means estimated GPU fit or possible
              weight offloading within the documented context. Exact artifacts
              are paired in details and comparison.
            </p>
          </section>
        }
        <atlas-chart /><atlas-comparison #comparison /><atlas-catalog />
      </div>
      <atlas-detail (comparisonRequested)="comparison.reveal()" />
    </div>
    @if (s.notice()) {
      <div class="notice-banner" role="status">
        <span>{{ s.notice() }}</span
        ><button
          class="remove-button"
          aria-label="Dismiss notification"
          (click)="s.notice.set('')"
        >
          ×
        </button>
      </div>
    }
  `,
})
export class ExplorerComponent {
  readonly s = inject(AtlasStore);
}
