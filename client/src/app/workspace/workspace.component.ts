import { MatTooltipModule } from "@angular/material/tooltip";
import { MatSortModule, Sort } from "@angular/material/sort";
import { LiveAnnouncer } from "@angular/cdk/a11y";
import { MatTableModule } from "@angular/material/table";
import { MatSelectModule } from "@angular/material/select";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatIconModule } from "@angular/material/icon";
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { DatePipe } from "@angular/common";
import { FavouritesComponent } from "./favourites.component";
import { FavouriteButtonComponent } from "./favourite-button.component";
import {
  Component,
  inject,
  computed,
  signal,
  OnDestroy,
  effect,
} from "@angular/core";
import { A11yModule } from "@angular/cdk/a11y";
import { FormsModule, ReactiveFormsModule, FormControl } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { WorkspaceStore } from "./workspace.store";
import { SummaryComponent } from "./summary.component";
import { GPUS, TASKS, Task, quality, contextK, SCORE_HINT } from "./ranking";
@Component({
  standalone: true,
  imports: [MatTooltipModule, MatSortModule, MatTableModule, MatSelectModule, MatCheckboxModule, MatExpansionModule, MatAutocompleteModule, MatInputModule, MatFormFieldModule, MatButtonModule, ReactiveFormsModule, MatIconModule, DatePipe, FavouritesComponent, FavouriteButtonComponent, RouterLink, SummaryComponent, A11yModule, FormsModule],
  templateUrl: "./workspace.component.html",
})
export class WorkspaceComponent implements OnDestroy {
  private readonly announcer = inject(LiveAnnouncer);
  sortTable(sort: Sort) {
    this.s.sort.set(sort.active);
    this.s.descending.set(sort.direction === "desc");
    this.announcer.announce(`Sorted by ${sort.active}, ${sort.direction === "desc" ? "descending" : "ascending"}.`);
  }
  readonly s = inject(WorkspaceStore);
  readonly route = inject(ActivatedRoute);
  readonly params = toSignal(this.route.paramMap);
  readonly id = computed(() => this.params()?.get("id"));
  readonly detail = computed(() =>
    this.s.rows().find((x) => x.r.id === this.id()),
  );
  readonly recommendedDetail = computed(() =>
    this.s.top().find((x) => x.r.id === this.id()),
  );
  readonly rank = computed(() =>
    this.s.entered()
      ? this.s.top().findIndex((x) => x.r.id === this.id()) + 1
      : 0,
  );
  readonly scoreHint = SCORE_HINT;
  readonly tasks = TASKS;
  readonly quality = quality;
  readonly contextK = contextK;
  readonly benchmarks = ['IFEval', 'MMLU-Pro'];
  readonly gpuInput = new FormControl(this.s.profile().gpu, {nonNullable:true});
  private readonly gpuQuery = toSignal(this.gpuInput.valueChanges, {initialValue:this.gpuInput.value});
  readonly filteredGpus = computed(() => {
    const query = this.gpuQuery() === this.s.profile().gpu ? '' : this.gpuQuery().trim().toLowerCase();
    return GPUS.filter(g => g.name.toLowerCase().includes(query));
  });
  readonly recommendationIndex = signal(0);
  readonly activeRecommendation = computed(() =>
    Math.min(this.recommendationIndex(), Math.max(0, this.s.top().length - 1)),
  );
  readonly viewIcons: Record<string, string> = {
    Table: "view_list",
    Tiles: "view_module",
    Bars: "bar_chart",
    Plot: "scatter_plot",
  };
  nextRecommendation(direction: number) {
    const count = this.s.top().length;
    if (count)
      this.recommendationIndex.set(
        direction < 0
          ? Math.max(0, this.activeRecommendation() - 1)
          : (this.activeRecommendation() + 1) % count,
      );
  }
  readonly views = ["Table", "Plot", "Bars", "Tiles"];
  readonly columns = [
    ["name", "Model"],
    ["parameters", "Parameters"],
    ["context", "Max context"],
    ["memory", "VRAM"],
    ["speed", "Speed tokens/s"],
    ["score", "Score"],
  ];
  readonly tableColumns = [...this.columns.map(c => c[0]), "actions"];
  readonly trackRelease = (_: number, row: {r:{id:string}}) => row.r.id;
  readonly plotted = computed(() =>
    this.s.visible().filter((x) => x.speed !== null),
  );
  readonly prompt = signal("Explain quantization simply.");
  readonly output = signal("");
  readonly running = signal(false);
  private timer: ReturnType<typeof setInterval> | undefined;
  readonly demoRate = signal(false);
  readonly response =
    "Quantization reduces the precision used to store model weights. This can save memory, but quality and runtime support vary. Compare a few candidate variants with your own prompts before choosing. This is a prepared demonstration response, not model inference.";
  readonly ticks = signal(0);
  readonly simulationRate = signal<number | null>(null);
  openPreview(id: string) {
    this.s.preview.set(id);
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(".preview")?.focus(),
    );
  }
  clamp(v: number) {
    return Math.min(200, v);
  }
  constructor() {
    effect(() => this.gpuInput.setValue(this.s.profile().gpu));
    effect(() => {
      this.id();
      this.resetChat();
    });
  }
  task(v: string) {
    this.s.task.set(v as Task);
  }
  selectGpu(name: string) {
    this.s.gpu(name);
    this.gpuInput.setValue(this.s.profile().gpu);
  }
  finishGpuSearch() {
    if (!this.gpuInput.value.trim()) this.s.gpu(null);
    this.gpuInput.setValue(this.s.profile().gpu);
  }
  clearGpu() {
    this.s.gpu(null);
    this.gpuInput.setValue('');
  }
  start() {
    this.stop();
    const x = this.detail();
    const rate = x?.speed
      ? x.speed.typical
      : this.demoRate()
        ? 12
        : null;
    if (!rate) {
      this.s.message.set(
        "No speed estimate. Enable the explicit demo rate to simulate.",
      );
      return;
    }
    this.output.set("");
    this.ticks.set(0);
    this.simulationRate.set(rate);
    this.running.set(true);
    let count = 0;
    this.timer = setInterval(() => {
      count++;
      this.ticks.set(count);
      this.output.set(
        this.response.slice(0, Math.floor(count * rate * 0.1 * 4)),
      );
      if (this.output().length >= this.response.length) this.stop();
    }, 100);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.running.set(false);
  }
  resetChat() {
    this.stop();
    this.output.set("");
    this.ticks.set(0);
    this.simulationRate.set(null);
  }
  ngOnDestroy() {
    this.stop();
  }
}
