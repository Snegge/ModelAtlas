import { DOCUMENT } from "@angular/common";
import { DestroyRef, Injectable, inject, signal } from "@angular/core";

/** Fullscreen belongs to the persistent shell, not a routed page. */
@Injectable({ providedIn: "root" })
export class FullscreenService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private target: HTMLElement | null = null;
  readonly active = signal(false);
  readonly supported = signal(false);
  readonly pending = signal(false);
  readonly message = signal("");

  constructor() {
    const sync = () => this.sync();
    this.document.addEventListener("fullscreenchange", sync);
    this.destroyRef.onDestroy(() =>
      this.document.removeEventListener("fullscreenchange", sync),
    );
  }

  attach(target: HTMLElement) {
    this.target = target;
    this.supported.set(
      !!this.document.fullscreenEnabled &&
        typeof target.requestFullscreen === "function",
    );
    this.sync();
  }

  private sync() {
    this.active.set(
      !!this.target && this.document.fullscreenElement === this.target,
    );
  }

  async toggle() {
    if (this.pending()) return;
    this.message.set("");
    if (!this.supported() || !this.target) {
      this.message.set("Fullscreen is unavailable in this browser.");
      return;
    }
    this.pending.set(true);
    try {
      if (this.document.fullscreenElement === this.target) {
        await this.document.exitFullscreen();
      } else {
        await this.target.requestFullscreen();
      }
    } catch {
      this.message.set(
        "The browser could not change fullscreen mode. You can continue in the window or try again.",
      );
    } finally {
      this.sync();
      this.pending.set(false);
    }
  }
}
