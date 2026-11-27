import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
﻿import { Component, inject, input, output } from "@angular/core";
import { Row } from "./ranking";
import { WorkspaceStore } from "./workspace.store";

@Component({
  selector: "atlas-favourite-button",
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <button mat-icon-button [disableRipple]="true" class="favourite-star" type="button"
      [attr.aria-pressed]="s.favourites().includes(row().a.id)"
      [attr.aria-label]="s.favourites().includes(row().a.id) ? 'Remove favourite' : 'Add favourite'"
      [attr.title]="(s.favourites().includes(row().a.id) ? 'Remove favourite: ' : 'Add favourite: ') + row().r.name + ' · ' + row().a.quantization"
      (click)="toggle($event)">
      <mat-icon [fontIcon]="s.favourites().includes(row().a.id) ? 'star' : 'star_border'"></mat-icon>
    </button>
  `,
  styles: [`
    :host { display: inline-flex; vertical-align: middle; }
    button.favourite-star { display: inline-flex; align-items: center; justify-content: center;
      --mat-icon-button-hover-state-layer-opacity: 0;
      --mat-icon-button-pressed-state-layer-opacity: 0;
      --mat-icon-button-focus-state-layer-opacity: 0;
      width: 44px; height: 44px; min-width: 44px; padding: 10px; margin: 0;
      border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--paper); color: var(--link); }
    button.favourite-star:hover, button.favourite-star[aria-pressed="true"] { background: var(--accent); }
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
