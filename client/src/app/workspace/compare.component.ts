import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { A11yModule } from "@angular/cdk/a11y";
import { MemoryComponent } from "../components/memory.component";
import { WorkspaceStore } from "./workspace.store";
@Component({
  selector: "atlas-compare",
  standalone: true,
  imports: [RouterLink, A11yModule, MemoryComponent],
  template: `
    <aside
      [cdkTrapFocus]="s.drawer()"
      [cdkTrapFocusAutoCapture]="true"
      (keydown.escape)="s.drawer.set(false)"
      class="comparison-panel"
      [class.mobile-open]="s.drawer()"
      aria-label="Variant comparison"
    >
      <div class="section-heading">
        <h2>Compare {{ s.comparisons().length }}/3</h2>
        <button (click)="s.drawer.set(false)" class="mobile-close">
          Close comparison
        </button>
      </div>
      <p>
        Same hardware, task and {{ s.profile().context }}-token context. Exact
        variants stay pinned.
      </p>
      @if (!s.comparisons().length) {
        <p>Add up to three variants from any view.</p>
      }
      @for (id of s.comparisons(); track id) {
        @if (s.row(id); as x) {
          <article>
            <h3>
              <mark>{{ x.r.name }}</mark>
            </h3>
            <span class="comparison-quant">{{ x.a.quantization }}</span>
            @if (x.e) {
              <atlas-memory
                [estimate]="x.e"
                [scaleGiB]="s.profile().vram"
                [compact]="true"
              />
            }
            <p>
              Score {{ x.score ?? "Unknown" }} · demo quality
              {{ x.q.toFixed(0) }} · {{ x.status }}
            </p>
            <p>
              Speed
              {{
                x.speed
                  ? x.speed.low + "–" + x.speed.high + " estimated tokens/s"
                  : "unknown"
              }}
              · memory {{ x.e?.totalGiB?.toFixed(2) ?? "unknown" }} GiB
            </p>
            <p>
              GPU {{ x.e?.gpuRequiredGiB?.toFixed(2) ?? "unknown" }} / RAM
              {{ x.e?.systemRequiredGiB?.toFixed(2) ?? "unknown" }} GiB · max
              context {{ x.r.contextLimit ?? "unknown" }} ·
              {{ x.r.license ?? "Unknown license" }}
            </p>
            <p>
              No measured benchmarks. Release-level demo quality; quantization
              effects unknown.
            </p>
            <a [href]="x.a.sourceUrl">Variant source</a> ·
            <a [routerLink]="['/models', x.r.id]">Details</a
            ><button (click)="s.toggle(id)">
              Remove {{ x.a.quantization }}
            </button>
          </article>
        }
      }
    </aside>
  `,
})
export class CompareComponent {
  readonly s = inject(WorkspaceStore);
}
