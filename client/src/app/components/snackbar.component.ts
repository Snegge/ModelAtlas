import { MatIconModule } from "@angular/material/icon";
import { Component, effect, inject } from "@angular/core";
import { WorkspaceStore } from "../workspace/workspace.store";

/** Global, non-modal feedback. Never moves focus or changes document layout. */
@Component({
  selector: "atlas-snackbar",
  standalone: true,
  imports: [MatIconModule],
  template: `
    @if (s.message()) {
      <div class="snackbar" role="status" aria-live="polite" aria-atomic="true">
        <span>{{ s.message() }}</span>
        <button
          type="button"
          aria-label="Dismiss notification"
          (click)="s.message.set('')"
        >
          <mat-icon fontIcon="close"></mat-icon>
        </button>
      </div>
    }
  `,
})
export class SnackbarComponent {
  readonly s = inject(WorkspaceStore);
  constructor() {
    effect((onCleanup) => {
      if (!this.s.message()) return;
      const timer = setTimeout(() => this.s.message.set(""), 6000);
      onCleanup(() => clearTimeout(timer));
    });
  }
}
