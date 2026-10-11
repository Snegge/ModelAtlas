import { Component, inject } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AtlasStore } from "./core/atlas.store";
@Component({
  selector: "atlas-app",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <a class="skip-link" href="#main-content">Skip to workspace</a>
    <header class="app-header">
      <a class="brand" routerLink="/" aria-label="Model Atlas explorer"
        ><img src="/atlas.svg" alt="" width="32" height="32" /><span
          >MODEL <strong>ATLAS</strong></span
        ><span class="prototype-tag">INTERACTION LAB</span></a
      >
      <nav aria-label="Main navigation">
        <a
          routerLink="/"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          >Explorer</a
        ><a routerLink="/methodology" routerLinkActive="active"
          >Method & data</a
        >
      </nav>
      <span class="offline-tag"
        ><i></i> Bundled catalog · offline exploration</span
      >
    </header>
    <main id="main-content" tabindex="-1"><router-outlet /></main>
    <div class="announcement" aria-live="polite" role="status">
      {{ s.notice() }}
    </div>
    <footer class="app-footer">
      <span>Model Atlas / Interaction Design prototype</span
      ><span>Memory estimates, not execution guarantees.</span>
    </footer>
  `,
})
export class AppComponent {
  readonly s = inject(AtlasStore);
}
