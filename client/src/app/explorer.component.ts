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
        <atlas-chart /><atlas-comparison /><atlas-catalog />
      </div>
      <atlas-detail />
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
