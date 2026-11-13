import { FavouriteButtonComponent } from "./workspace/favourite-button.component";
import { Component, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { HIGHLIGHTS } from "./discover-highlights";
import { DISCOVER_METADATA } from "./discover-metadata";
import { WorkspaceStore } from "./workspace/workspace.store";

@Component({
  standalone: true,
  imports: [FavouriteButtonComponent, RouterLink],
  template: `
    <section class="discover-page" aria-labelledby="discover-title">
      <div class="discover-entry">
      <h1 id="discover-title">This week's highlighted models</h1>
      <p class="discover-intro">Ten curated prototype picks for your own tests. No automatic weekly rotation.</p>
      <section class="highlight-carousel" aria-label="Model highlights" aria-roledescription="carousel"
        tabindex="0" (keydown.arrowleft)="step(-1); $event.preventDefault()" (keydown.arrowright)="step(1); $event.preventDefault()"
        (pointercancel)="touch = null" (pointerdown)="touchStart($event)" (pointerup)="touchEnd($event)">
        <button class="carousel-arrow" aria-label="Previous highlight" (click)="step(-1)"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m15 6-6 6 6 6" /></svg></button>
        <article class="highlight-card active">
          <div class="discover-kicker"><span>{{ highlight().category }}</span><span role="status">{{ index() + 1 }} of 10</span></div>
          <h2>{{ highlight().name }}</h2>
          <p class="publisher">{{ highlight().publisher }}</p>
          <p>{{ highlight().description }} Typical tasks: {{ highlight().tasks }}.</p>
          <p class="highlight-reason"><strong>Why this model?</strong> {{ highlight().subtitle }}</p>
          @if (highlightRow(); as x) {
            <dl class="discover-metrics">
              <div><dt>Parameters</dt><dd>{{ x.r.totalParameters === null ? 'Unknown' : (x.r.totalParameters / 1e9).toLocaleString("en", { maximumFractionDigits: 2 }) + 'B' }}</dd></div>
              <div><dt>Selected variant</dt><dd>{{ x.a.quantization }}</dd></div>
              <div><dt>Estimated memory</dt><dd>{{ x.e?.totalGiB == null ? 'Unknown' : x.e!.totalGiB!.toFixed(1) + ' GiB' }}</dd></div>
            </dl>
            <p class="publisher">Model context limit: {{ x.r.contextLimit?.toLocaleString() ?? 'Unknown' }} tokens &middot; Requested: {{ s.profile().context.toLocaleString() }} tokens</p>
            <div class="quantization-chips" role="group" aria-label="Highlight variant">
              @for (variant of s.api.variants(x.r.id); track variant.id) {
                <button [attr.aria-pressed]="variant.id === x.a.id" (click)="s.variant(x.r.id, variant.id)">{{ variant.quantization }}</button>
              }
            </div>
            <p class="discover-caveat">Memory is estimated, not a hardware guarantee. Speed and answer quality require your own tests; runtime compatibility is unverified.</p>
            <div class="discover-actions">
              <a class="discover-primary" [routerLink]="['/models', x.r.id]">View model &rarr;</a>
              <atlas-favourite-button [row]="x" />
              <button (click)="learn()">Learn more &darr;</button>
            </div>
          } @else { <p role="status">{{ s.api.loading() ? 'Loading model information...' : 'Model information unavailable. Open Explorer to retry.' }}</p><a routerLink="/">Open Explorer</a> }
        </article>
        <button class="carousel-arrow" aria-label="Next highlight" (click)="step(1)"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6" /></svg></button>
      </section>
      <a class="discover-transition" href="#discover-details" (click)="$event.preventDefault(); learn()">Explore the selection below &darr;</a>
      </div>
        <div class="discover-filters" role="group" aria-label="Discover collections">
          @for (tab of tabs; track tab) {
            <button [attr.aria-pressed]="collection() === tab" (click)="changeCollection(tab)">{{ tab }}</button>
          }
        </div>
        <p class="collection-note">{{ collectionNote() }}</p>
        <div class="discover-layout" id="discover-details">

          <aside class="discover-shortlist" aria-label="Models to explore">
            <h2>{{ picks().length }} models to explore</h2>
            @for (pick of picks(); track pick.id; let i = $index) {
              <button [attr.aria-pressed]="selected() === pick.id" (click)="select(pick.id)">
                <span class="discover-number">{{ selected() === pick.id ? "Selected" : i + 1 }}</span>
                <span><strong>{{ pick.name }}</strong><small>{{ pick.category }} · {{ pick.subtitle }}</small></span>
              </button>
            }
          </aside>
          <article class="discover-feature">
            <div class="discover-kicker"><span>EDITOR’S PICK</span>{{ pick().category }}</div>
            <h2 id="detail-title" tabindex="-1">{{ row()?.r?.name ?? pick().name }}</h2><p class="publisher">{{ pick().publisher }}</p>
            <p class="discover-description">{{ pick().description }}</p>
            <h3>Why this model?</h3>
            <p class="discover-reason">{{ pick().reason }}</p>
            @if (collection() !== 'Highlights') { <p class="publisher">{{ evidence() }} <a [href]="metadata()?.source" target="_blank" rel="noopener">Source &nearr;</a></p> }
            @if (row(); as x) {
              <dl class="discover-metrics">
                <div><dt>Parameters</dt><dd>{{ x.r.totalParameters === null ? 'Unknown' : (x.r.totalParameters / 1e9).toLocaleString("en", { maximumFractionDigits: 2 }) + 'B' }}</dd></div>
                <div><dt>Selected variant</dt><dd>{{ x.a.quantization }}</dd></div>
                <div><dt>Estimated memory</dt><dd>{{ x.e?.totalGiB == null ? 'Unknown' : x.e!.totalGiB!.toFixed(1) + ' GiB' }}</dd></div>
              </dl>
            } @else {
              <p class="discover-unavailable" role="status">{{ s.api.loading() ? 'Loading catalog…' : 'This reference model is not available in the bundled catalog.' }}</p>
              @if (s.api.error()) { <p role="alert">{{ s.api.error() }}</p> }
            }
            <p class="discover-caveat">Typical tasks: {{ pick().tasks }}.<br>Estimates are not measured performance. Runtime compatibility is unverified.<br>Hardware fit depends on context and runtime.<br>Popularity is not proof of quality for your task.</p>
            <div class="discover-actions">
              @if (row(); as x) {
                <a class="discover-primary" [routerLink]="['/models', x.r.id]">View model →</a>
                <atlas-favourite-button [row]="x" />
                @if (s.favourites().length) {
                  <a routerLink="/" fragment="model-catalog" (click)="s.favouritesOpen.set(true)">View favourites →</a>
                }
              } @else { <a routerLink="/">Explore the catalog →</a> }
            </div>
          </article>
        </div>
    </section>
  `,
  styleUrl: "./discover.component.css",
})
export class DiscoverComponent {
  readonly s = inject(WorkspaceStore);
  readonly tabs = ["Highlights", "New Releases", "Most discussed", "Popular"];
  readonly collection = signal("Highlights");
  readonly highlightId = signal<string>(HIGHLIGHTS[0].id);
  readonly selected = signal<string>(HIGHLIGHTS[0].id);
  readonly index = computed(() => HIGHLIGHTS.findIndex(x => x.id === this.highlightId()));
  readonly highlight = computed(() => HIGHLIGHTS[this.index()]);
  readonly highlightRow = computed(() => this.s.rows().find(x => x.r.id === this.highlightId()));
  readonly picks = computed(() => {
    if (this.collection() === "Highlights") return [...HIGHLIGHTS];
    const metric = this.collection();
    return [...DISCOVER_METADATA.models]
      .sort((a, b) => metric === "New Releases" ? b.createdAt.localeCompare(a.createdAt) :
        metric === "Popular" ? b.downloads - a.downloads : b.discussions - a.discussions)
      .filter(m => this.s.api.release(m.id))
      .slice(0, 10).map(m => {
        const r = this.s.api.release(m.id)!;
        const editorial = HIGHLIGHTS.find(x => x.id === m.id);
        return editorial ?? { id: r.id, name: r.name, publisher: r.publisher, category: r.family,
          subtitle: this.metricText(m), description: r.family + " model from " + r.publisher + ".",
          tasks: "evaluate on your own repeatable prompts",
          reason: "Included by " + (metric === "New Releases" ? "repository creation date" : metric === "Popular" ? "download count" : "community thread count") + " among the bundled catalog models. This is not an assessment of answer quality." };
      });
  });
  readonly pick = computed(() => this.picks().find(x => x.id === this.selected()) ?? this.picks()[0] ?? HIGHLIGHTS[0]);
  readonly row = computed(() => this.s.rows().find(x => x.r.id === this.pick().id));
  readonly metadata = computed(() => DISCOVER_METADATA.models.find(x => x.id === this.pick().id));
  readonly evidence = computed(() => this.metadata() ? this.metricText(this.metadata()!) : "Metadata unavailable");
  readonly collectionNote = computed(() => this.collection() === "Highlights" ? "Curated prototype selection. The same ten models appear in the carousel." :
    (this.collection() === "New Releases" ? "Newest repository creation dates in this catalog; these may precede the public model release." :
     this.collection() === "Popular" ? "Most Hugging Face downloads in the last 30 days, among catalog models." :
     "Most Hugging Face community threads, including pull requests, among catalog models.") +
    " Snapshot: " + DISCOVER_METADATA.retrievedAt.slice(0, 10) + ". Not a live ranking.");
  metricText(m: typeof DISCOVER_METADATA.models[number]) {
    return this.collection() === "New Releases" ? "Repository created " + m.createdAt.slice(0, 10) :
      this.collection() === "Popular" ? m.downloads.toLocaleString() + " downloads / 30 days" :
      m.discussions.toLocaleString() + " community threads (including PRs)";
  }
  changeCollection(tab: string) {
    this.collection.set(tab);
    this.selected.set(tab === "Highlights" ? this.highlightId() : this.picks()[0]?.id ?? "");
  }
  select(id: string) {
    this.selected.set(id);
    if (this.collection() === "Highlights") this.highlightId.set(id);
  }
  step(direction: number) {
    this.highlightId.set(HIGHLIGHTS[(this.index() + direction + 10) % 10].id);
    if (this.collection() === "Highlights") this.selected.set(this.highlightId());
  }
  learn() {
    this.changeCollection("Highlights");
    document.getElementById("detail-title")?.focus({ preventScroll: true });
    document.getElementById("detail-title")?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
    });
  }
  touch: { x: number; y: number } | null = null;
  touchStart(event: PointerEvent) {
    if (event.pointerType === "touch") this.touch = { x: event.clientX, y: event.clientY };
  }
  touchEnd(event: PointerEvent) {
    if (!this.touch) return;
    const dx = event.clientX - this.touch.x, dy = event.clientY - this.touch.y;
    this.touch = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) this.step(dx < 0 ? 1 : -1);
  }
}
