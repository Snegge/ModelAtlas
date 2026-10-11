import {
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { FullscreenService } from "../core/fullscreen.service";
import { PITCH_SLIDES } from "./pitch-slides";

@Component({
  selector: "atlas-pitch",
  standalone: true,
  imports: [RouterLink],
  templateUrl: "./pitch.component.html",
  styleUrl: "./pitch.component.css",
})
export class PitchComponent {
  readonly fullscreen = inject(FullscreenService);
  readonly slides = PITCH_SLIDES;
  readonly index = signal(0);
  readonly slide = computed(() => this.slides[this.index()]);

  goTo(index: number) {
    this.index.set(Math.max(0, Math.min(this.slides.length - 1, index)));
  }

  @HostListener("document:keydown", ["$event"])
  onKeydown(event: KeyboardEvent) {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest(
        "input, textarea, select, button, a, summary, [contenteditable]:not([contenteditable='false']), [role='button'], [role='link'], [role='textbox'], [role='slider'], [role='spinbutton'], [role='combobox'], [role='menu'], [role='listbox']",
      )
    )
      return;
    const destinations: Record<string, number> = {
      ArrowLeft: this.index() - 1,
      ArrowRight: this.index() + 1,
      Home: 0,
      End: this.slides.length - 1,
    };
    const next = destinations[event.key];
    if (next === undefined) return;
    event.preventDefault();
    this.goTo(next);
  }
}
