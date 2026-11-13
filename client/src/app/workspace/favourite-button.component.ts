import { Component, inject, input, output } from "@angular/core";
import { Row } from "./ranking";
import { WorkspaceStore } from "./workspace.store";

@Component({
  selector: "atlas-favourite-button",
  standalone: true,
  template: `
    <button class="favourite-star" type="button"
      [attr.aria-pressed]="s.favourites().includes(row().a.id)"
      [attr.aria-label]="s.favourites().includes(row().a.id) ? 'Remove favourite' : 'Add favourite'"
      [attr.title]="(s.favourites().includes(row().a.id) ? 'Remove favourite: ' : 'Add favourite: ') + row().r.name + ' · ' + row().a.quantization"
      (click)="toggle($event)">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"
        [attr.fill]="s.favourites().includes(row().a.id) ? 'currentColor' : 'none'">
        <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />
      </svg>
    </button>
  `,
  styles: [`
    :host { display: inline-flex; vertical-align: middle; }
    button.favourite-star { display: inline-flex; align-items: center; justify-content: center;
      width: 44px; height: 44px; min-width: 44px; padding: 10px; margin: 0;
      border: 1px solid var(--line); border-radius: 8px; background: var(--paper); color: #2458bb; }
    button.favourite-star:hover, button.favourite-star[aria-pressed="true"] { background: var(--accent); }
    svg { display: block; width: 22px; height: 22px; stroke: currentColor; stroke-width: 1.7; stroke-linejoin: round; }
  `],
})
export class FavouriteButtonComponent {
  readonly row = input.required<Row>();
  readonly removed = output<Event>();
  readonly s = inject(WorkspaceStore);
  toggle(event: Event) {
    const saved = this.s.favourites().includes(this.row().a.id);
    this.s.toggle(this.row().a.id);
    if (saved) this.removed.emit(event);
  }
}
