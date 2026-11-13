import { Component, inject } from "@angular/core";
import { SummaryComponent } from "./summary.component";
import { WorkspaceStore } from "./workspace.store";

@Component({
  selector: "atlas-favourites",
  standalone: true,
  imports: [SummaryComponent],
  template: `
    <aside class="favourites-panel" id="catalog-favourites" aria-label="Saved favourites">
      <h2 class="favourites-panel-title">Favourites <span class="favourites-count">{{ s.favourites().length }}</span></h2>
      <div class="favourites-content">
        <p class="favourites-hint">Saved model variants. Kept on this device.</p>
        @if (!s.favourites().length) {
          <p>Add favourites from the catalog, Discover or model details to keep your shortlist here.</p>
        }
        <div class="favourites-list">
          @for (id of s.favourites(); track id) {
            @if (s.row(id); as x) {
              <article class="model-tile">
                <atlas-summary [row]="x" [showEvidence]="false" [showVariants]="false" (removed)="removed($event)" />
              </article>
            }
          }
        </div>
      </div>
    </aside>
  `,
})
export class FavouritesComponent {
  readonly s = inject(WorkspaceStore);
  removed(event: Event) {
    const article = (event.currentTarget as HTMLElement).closest("article");
    const next = article?.nextElementSibling ?? article?.previousElementSibling;
    const target = next?.querySelector("atlas-favourite-button button") ?? document.querySelector(".catalog-favourites-trigger");
    (target as HTMLElement | null)?.focus();
  }
}
