import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  viewChild,
} from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AtlasStore } from "./core/atlas.store";
import { FullscreenService } from "./core/fullscreen.service";
@Component({
  selector: "atlas-app",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div
      #appShell
      class="app-shell"
      [class.shell-fullscreen]="fullscreen.active()"
    >
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
          ><a routerLink="/pitch" routerLinkActive="active">Project pitch</a>
        </nav>
        <span class="offline-tag"
          ><i></i> Bundled catalog · offline exploration</span
        >
        @if (fullscreen.active()) {
          <button
            class="button shell-fullscreen-exit"
            (click)="fullscreen.toggle()"
            [disabled]="fullscreen.pending()"
          >
            Exit fullscreen
          </button>
        }
      </header>
      <main id="main-content" tabindex="-1"><router-outlet /></main>
      <div class="announcement" aria-live="polite" role="status">
        {{ s.notice() }}
      </div>
      <footer class="app-footer">
        <span>Model Atlas / Interaction Design prototype</span
        ><span>Memory estimates, not execution guarantees.</span>
      </footer>
    </div>
  `,
  styles: `
    .app-shell {
      min-height: 100dvh;
    }
    .app-shell:fullscreen {
      background: #f1f4ed;
      height: 100dvh;
      overflow: auto;
    }
    .shell-fullscreen-exit {
      position: fixed;
      right: 24px;
      top: 16px;
      z-index: 60;
      min-height: 42px;
    }
    .shell-fullscreen .offline-tag {
      visibility: hidden;
    }
    @media (max-width: 520px) {
      .shell-fullscreen-exit {
        top: 10px;
        right: 12px;
        font-size: 10px;
        min-height: 32px;
        padding: 7px;
      }
    }
  `,
})
export class AppComponent implements AfterViewInit {
  readonly s = inject(AtlasStore);
  readonly fullscreen = inject(FullscreenService);
  private readonly shell =
    viewChild.required<ElementRef<HTMLElement>>("appShell");

  ngAfterViewInit() {
    this.fullscreen.attach(this.shell().nativeElement);
  }
}
