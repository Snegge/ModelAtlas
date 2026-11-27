import { MatTabsModule } from "@angular/material/tabs";
import { NgTemplateOutlet } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { contextK } from "./core/gpus";
import { MatIconModule } from "@angular/material/icon";
import { FavouriteButtonComponent } from "./workspace/favourite-button.component";
import { Component, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { HIGHLIGHTS } from "./discover-highlights";
import { DISCOVER_METADATA } from "./discover-metadata";
import { WorkspaceStore } from "./workspace/workspace.store";

@Component({
  standalone: true,
  imports: [MatTabsModule, NgTemplateOutlet, MatButtonModule, MatIconModule, FavouriteButtonComponent, RouterLink],
  template: `
    <section class="discover-page" aria-labelledby="discover-title">
      <div class="discover-entry">
      <h1 id="discover-title">This week's highlighted models</h1>
      <p class="discover-intro">Ten curated prototype picks for your own tests. No automatic weekly rotation.</p>
      <section class="highlight-carousel" aria-label="Model highlights" aria-roledescription="carousel"
        tabindex="0" (keydown.arrowleft)="step(-1); $event.preventDefault()" (keydown.arrowright)="step(1); $event.preventDefault()"
        (pointercancel)="touch = null" (pointerdown)="touchStart($event)" (pointerup)="touchEnd($event)">
        <button mat-icon-button class="carousel-arrow" aria-label="Previous highlight" (click)="step(-1)"><mat-icon fontIcon="chevron_left"></mat-icon></button>
        <article class="highlight-card active">
          <div class="discover-kicker"><span>{{ highlight().category }}</span><span role="status">{{ index() + 1 }} of 10</span></div>
          <h2><a class="model-name-link" [routerLink]="['/models', highlight().id]">{{ highlight().name }}</a></h2>
          <p class="publisher">{{ highlight().publisher }}</p>
          <p>{{ highlight().description }} Typical tasks: {{ highlight().tasks }}.</p>
          <p class="highlight-reason"><strong>Why this model?</strong> {{ highlight().subtitle }}</p>
          @if (highlightRow(); as x) {
            <dl class="discover-metrics">
              <div><dt>Parameters</dt><dd>{{ x.r.totalParameters === null ? 'Unknown' : (x.r.totalParameters / 1e9).toLocaleString("en", { maximumFractionDigits: 2 }) + 'B' }}</dd></div>
              <div><dt>Selected variant</dt><dd>{{ x.a.quantization }}</dd></div>
              <div><dt>Estimated memory</dt><dd>{{ x.e?.totalGiB == null ? 'Unknown' : x.e!.totalGiB!.toFixed(1) + ' GiB' }}</dd></div>
            </dl>
            <p class="publisher">Model context limit: {{ contextK(x.r.contextLimit) }} tokens &middot; Requested: {{ contextK(s.profile().context) }} tokens</p>
            <div class="quantization-chips" role="group" aria-label="Highlight variant">
              @for (variant of s.api.variants(x.r.id); track variant.id) {
                <button mat-stroked-button [attr.aria-pressed]="variant.id === x.a.id" (click)="s.variant(x.r.id, variant.id)">{{ variant.quantization }}</button>
              }
            </div>
            <p class="discover-caveat">Memory is estimated, not a hardware guarantee. Speed and answer quality require your own tests; runtime compatibility is unverified.</p>
            <div class="discover-actions">
              <a mat-flat-button class="discover-primary" [routerLink]="['/models', x.r.id]">View model <mat-icon iconPositionEnd fontIcon="arrow_forward"></mat-icon></a>
              <atlas-favourite-button [row]="x" />
              <button mat-stroked-button (click)="learn()">Learn more <mat-icon iconPositionEnd fontIcon="arrow_downward"></mat-icon></button>
            </div>
          } @else { <p role="status">{{ s.api.loading() ? 'Loading model information...' : 'Model information unavailable. Open Explorer to retry.' }}</p><a routerLink="/">Open Explorer</a> }
        </article>
        <button mat-icon-button class="carousel-arrow" aria-label="Next highlight" (click)="step(1)"><mat-icon fontIcon="chevron_right"></mat-icon></button>
      </section>
      <a class="discover-transition" href="#discover-details" (click)="$event.preventDefault(); learn()">Explore the selection below <mat-icon iconPositionEnd fontIcon="arrow_downward"></mat-icon></a>
      </div>
        <mat-tab-group class="discover-filters" aria-label="Discover collections"
          [selectedIndex]="tabs.indexOf(collection())" (selectedIndexChange)="changeCollection(tabs[$event])"
          [mat-stretch-tabs]="false" mat-align-tabs="start" animationDuration="0ms">
          @for (tab of tabs; track tab) {
            <mat-tab [label]="tab">
              <ng-template matTabContent><ng-container [ngTemplateOutlet]="collectionContent" /></ng-template>
            </mat-tab>
          }
        </mat-tab-group>
        <ng-template #collectionContent>
        <p class="collection-note">{{ collectionNote() }}</p>
        <div class="discover-layout" id="discover-details">

          <aside class="discover-shortlist" aria-label="Models to explore">
            <h2>{{ picks().length }} models to explore</h2>
            @for (pick of picks(); track pick.id; let i = $index) {
              <button mat-stroked-button [attr.aria-pressed]="selected() === pick.id" (click)="select(pick.id)">
                <span class="shortlist-label">
                <span class="discover-number">{{ selected() === pick.id ? "Selected" : i + 1 }}</span>
                <span><strong>{{ pick.name }}</strong><small>{{ collection() === 'Highlights' ? pick.category + ' · ' + pick.subtitle : shortlistMetric(pick.id) }}</small></span>
                </span>
              </button>
            }
          </aside>
          <article class="discover-feature">
            <div class="discover-kicker"><span>EDITOR’S PICK</span>{{ pick().category }}</div>
            <h2 id="detail-title" tabindex="-1"><a class="model-name-link" [routerLink]="['/models', pick().id]">{{ row()?.r?.name ?? pick().name }}</a></h2><p class="publisher">{{ pick().publisher }}</p>
            <p class="discover-description">{{ pick().description }}</p>
            <h3>Why this model?</h3>
            <p class="discover-reason">{{ pick().reason }}</p>
            @if (collection() !== 'Highlights') { <p class="publisher">{{ evidence() }} <a [href]="metadata()?.source" target="_blank" rel="noopener">Source <mat-icon fontIcon="open_in_new"></mat-icon></a></p> }
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
                <a mat-flat-button class="discover-primary" [routerLink]="['/models', x.r.id]">View model <mat-icon iconPositionEnd fontIcon="arrow_forward"></mat-icon></a>
                <atlas-favourite-button [row]="x" />
                @if (s.favourites().length) {
                  <a routerLink="/" fragment="model-catalog" (click)="s.favouritesOpen.set(true)">View favourites <mat-icon iconPositionEnd fontIcon="arrow_forward"></mat-icon></a>
                }
              } @else { <a routerLink="/">Explore the catalog <mat-icon iconPositionEnd fontIcon="arrow_forward"></mat-icon></a> }
            </div>
          </article>
        </div>
        </ng-template>
    </section>
  `,
  styleUrl: "./discover.component.css",
})
export class DiscoverComponent {
  readonly contextK = contextK;
  readonly s = inject(WorkspaceStore);
  readonly tabs = ["Highlights", "New Releases", "Most discussed", "Popular"];
  readonly collection = signal("Highlights");
  readonly highlightId = signal<string>(HIGHLIGHTS[0].id);
  readonly selected = signal<string>(HIGHLIGHTS[0].id);
  readonly index = computed(() => HIGHLIGHTS.findIndex(x => x.id === this.highlightId()));
  readonly highlight = computed(() => HIGHLIGHTS[this.index()]);
  readonly highlightRow = computed(() => this.s.rows().find(x => x.r.id === this.highlightId()));
  readonly discoveryMetadata = computed(() => (this.s.api.catalog()?.releases ?? []).map(r => ({
    id:r.id, createdAt:r.releaseCreatedAt ?? r.retrievedAt,
    downloads:r.downloadsLastMonth ?? 0,
    discussions:DISCOVER_METADATA.models.find(m => m.id === r.id)?.discussions ?? 0,
    source:r.modelCardUrl,
  })));
  readonly picks = computed(() => {
    if (this.collection() === "Highlights") return [...HIGHLIGHTS];
    const metric = this.collection();
    return [...this.discoveryMetadata()]
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
  readonly metadata = computed(() => this.discoveryMetadata().find(x => x.id === this.pick().id));
  readonly evidence = computed(() => this.metadata() ? this.metricText(this.metadata()!) : "Metadata unavailable");
  readonly collectionNote = computed(() => this.collection() === "Highlights" ? "Curated prototype selection. The same ten models appear in the carousel." :
    (this.collection() === "New Releases" ? "Newest repository creation dates in this catalog; these may precede the public model release." :
     this.collection() === "Popular" ? "Most Hugging Face downloads in the last 30 days, among catalog models." :
     "Most Hugging Face community threads, including pull requests, among catalog models.") +
    " Snapshot: " + (this.collection() === "Most discussed" ? DISCOVER_METADATA.retrievedAt : this.s.api.coverage()?.retrievedAt ?? "").slice(0, 10) + ". Not a live ranking.");
  metricText(m: {createdAt:string;downloads:number;discussions:number}) {
    return this.collection() === "New Releases" ? "Repository created " + m.createdAt.slice(0, 10) :
      this.collection() === "Popular" ? m.downloads.toLocaleString() + " downloads / 30 days" :
      m.discussions.toLocaleString() + " community threads (including PRs)";
  }
  shortlistMetric(id: string) {
    const metadata = this.discoveryMetadata().find(m => m.id === id);
    return metadata ? this.metricText(metadata) : 'Metadata unavailable';
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
    requestAnimationFrame(() => {
      const tabs = document.querySelector<HTMLElement>('.discover-filters');
      tabs?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus({preventScroll:true});
      tabs?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'start'});
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
