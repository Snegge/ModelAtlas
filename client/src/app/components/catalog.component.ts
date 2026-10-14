import { Component, computed, effect, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { A11yModule } from "@angular/cdk/a11y";
import { AtlasStore } from "../core/atlas.store";
import { STATUS_SYMBOL } from "../core/models";
@Component({
  selector: "atlas-catalog",
  standalone: true,
  imports: [FormsModule, A11yModule],
  template: `
    <section class="catalog-panel" aria-labelledby="catalog-heading">
      <div class="panel-heading">
        <div>
          <div class="section-kicker">03 / INSPECT THE CATALOG</div>
          <h2 id="catalog-heading">
            Model releases
            <span class="count-pill">{{ s.visible().length }}</span>
          </h2>
        </div>
        <button
          class="button small-button"
          (click)="s.exportCsv()"
          [disabled]="!s.current() || !s.visible().length"
        >
          Export CSV ↗
        </button>
      </div>
      <div class="catalog-filters">
        <div class="search-field">
          <label for="search">Search model or publisher</label
          ><input
            id="search"
            type="search"
            placeholder="e.g. Qwen, Llama, microsoft…"
            [ngModel]="s.filters().search"
            (ngModelChange)="s.setFilter({ search: $event })"
          />
        </div>
        <div>
          <label for="family-filter">Family</label
          ><select
            id="family-filter"
            [ngModel]="s.filters().family"
            (ngModelChange)="s.setFilter({ family: $event })"
          >
            <option value="">All families</option>
            @for (f of s.families(); track f) {
              <option [value]="f">{{ f }}</option>
            }
          </select>
        </div>
        <div>
          <label for="quant-filter">Has artifact</label
          ><select
            id="quant-filter"
            [ngModel]="s.filters().quantization"
            (ngModelChange)="s.setFilter({ quantization: $event })"
          >
            <option value="">Any quantization</option>
            <option>Q4_K_M</option>
            <option>Q5_K_M</option>
            <option>Q8_0</option>
          </select>
        </div>
        <div>
          <label for="sort">Sort by</label
          ><select
            id="sort"
            [ngModel]="s.filters().sort"
            (ngModelChange)="s.setFilter({ sort: $event })"
          >
            <option value="memory">Estimated memory ↑</option>
            <option value="name">Model name A–Z</option>
            <option value="context">Documented context ↓</option>
            <option value="parameters">Total parameters ↑</option>
          </select>
        </div>
      </div>
      <div class="filter-summary">
        <label class="check-label"
          ><input
            type="checkbox"
            [ngModel]="s.filters().fitsOnly"
            (ngModelChange)="s.setFilter({ fitsOnly: $event })"
          />Estimated GPU fits only</label
        ><span class="small muted"
          >Filters affect the map and table; exact selections are
          retained.</span
        >
        @if (s.hasFilters()) {
          <button class="text-button" (click)="s.clearFilters()">
            Clear filters
          </button>
        }
      </div>
      @if (s.hasFilters()) {
        <div class="filter-chips" aria-label="Active filters">
          @if (s.filters().search) {
            <span>Search: {{ s.filters().search }}</span>
          }
          @if (s.filters().family) {
            <span>Family: {{ s.filters().family }}</span>
          }
          @if (s.filters().quantization) {
            <span>Available: {{ s.filters().quantization }}</span>
          }
          @if (s.filters().fitsOnly) {
            <span>Estimated GPU fits</span>
          }
        </div>
      }
      @if (s.visible().length) {
        <div
          class="table-scroll"
          tabindex="0"
          aria-label="Scrollable accessible model table"
        >
          <table>
            <caption class="sr-only">
              Catalog alternative to the plot. Select a model name to
              synchronize details. Quantization availability filters do not
              override the hardware preference.
            </caption>
            <thead>
              <tr>
                <th scope="col">Model release / publisher</th>
                <th scope="col">Representative</th>
                <th scope="col">Est. memory</th>
                <th scope="col">Context limit</th>
                <th scope="col">Scenario status</th>
                <th scope="col">Compare</th>
              </tr>
            </thead>
            <tbody>
              @for (p of paged(); track p.releaseId) {
                @let r = s.release(p.releaseId)!;
                @let a = s.artifact(p.artifactId)!;
                <tr
                  [class.selected-row]="s.focusedRelease()?.id === r.id"
                  [attr.data-release]="r.id"
                >
                  <td>
                    <button
                      class="model-select"
                      cdkMonitorElementFocus
                      (focus)="s.focusRelease(r.id)"
                      (click)="s.focusRelease(r.id)"
                      [attr.aria-pressed]="s.focusedRelease()?.id === r.id"
                    >
                      {{ r.name }}
                    </button>
                    <div class="model-meta">
                      {{ r.publisher }} · {{ r.family }} ·
                      {{
                        r.totalParameters
                          ? (r.totalParameters / 1e9).toFixed(1) + "B params"
                          : "Parameters unknown"
                      }}
                    </div>
                  </td>
                  <td>
                    <span class="quant-tag">{{ a.quantization }}</span>
                    @if (!p.preferenceMatched) {
                      <span class="tiny muted">Fallback: smallest</span>
                    }
                    @if (p.representativeChanged) {
                      <span class="tiny variant-change"
                        >Was
                        {{
                          s.artifact(p.baselineArtifactId)?.quantization
                        }}</span
                      >
                    }
                  </td>
                  <td class="numeric">
                    {{
                      p.scenario.totalGiB === null
                        ? "Unknown"
                        : p.scenario.totalGiB!.toFixed(2) + " GiB"
                    }}
                  </td>
                  <td class="numeric">
                    {{
                      r.contextLimit
                        ? r.contextLimit.toLocaleString()
                        : "Unknown"
                    }}<span class="tiny muted">tokens</span>
                  </td>
                  <td>
                    <span [class]="'status-label ' + p.scenario.status"
                      ><b>{{ symbols[p.scenario.status] }}</b
                      >{{ s.label[p.scenario.status] }}</span
                    >
                    @if (s.baseline() && p.change !== "stable") {
                      <span [class]="'tiny change-label ' + p.change">{{
                        p.change === "gained"
                          ? "Newly feasible"
                          : p.change === "lost"
                            ? "No longer feasible"
                            : p.change === "uncertain"
                              ? "Change uncertain"
                              : ""
                      }}</span>
                    }
                  </td>
                  <td>
                    <button
                      class="compare-toggle"
                      (click)="s.toggleCompare(a.id)"
                      [attr.aria-pressed]="s.comparisons().includes(a.id)"
                      [attr.aria-label]="
                        (s.comparisons().includes(a.id)
                          ? 'Remove '
                          : 'Compare ') +
                        r.name +
                        ' ' +
                        a.quantization
                      "
                    >
                      {{ s.comparisons().includes(a.id) ? "✓" : "+" }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <span
            >Showing {{ page() * pageSize + 1 }}–{{
              Math.min((page() + 1) * pageSize, s.visible().length)
            }}
            of {{ s.visible().length }} matching releases · map shows all
            matching releases</span
          >
          <div>
            <button
              class="button small-button"
              (click)="page.set(page() - 1)"
              [disabled]="page() === 0"
            >
              Previous</button
            ><span>{{ page() + 1 }} / {{ pages() }}</span
            ><button
              class="button small-button"
              (click)="page.set(page() + 1)"
              [disabled]="page() + 1 >= pages()"
            >
              Next
            </button>
          </div>
        </div>
      } @else {
        <div class="empty-state">
          <span class="empty-mark">⌕</span>
          <h3>No matching releases</h3>
          <p>
            Your selections are still available. Try a broader search or clear
            the filters.
          </p>
          <button class="button" (click)="s.clearFilters()">
            Clear all filters
          </button>
        </div>
      }
    </section>
  `,
})
export class CatalogComponent {
  readonly s = inject(AtlasStore);
  readonly symbols = STATUS_SYMBOL;
  readonly Math = Math;
  readonly page = signal(0);
  readonly pageSize = 12;
  readonly pages = computed(() =>
    Math.max(1, Math.ceil(this.s.visible().length / this.pageSize)),
  );
  readonly paged = computed(() =>
    this.s
      .visible()
      .slice(this.page() * this.pageSize, (this.page() + 1) * this.pageSize),
  );
  constructor() {
    effect(() => {
      this.s.filters();
      this.page.set(0);
    });
    effect(() => {
      const id = this.s.focusedRelease()?.id;
      const index = this.s.visible().findIndex((p) => p.releaseId === id);
      if (index >= 0) this.page.set(Math.floor(index / this.pageSize));
    });
  }
}
