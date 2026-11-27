import {
  Injectable,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from "@angular/core";
import { AtlasStore } from "../core/atlas.store";
import {
  EMPTY_PROFILE,
  GPUS,
  Profile,
  Task,
  evaluate,
  compareRecommendations,
  recommendedVariant,
  readWorkspace,
} from "./ranking";
@Injectable({ providedIn: "root" })
export class WorkspaceStore {
  readonly api = inject(AtlasStore);
  private saved = (() => {
    try {
      return readWorkspace(localStorage.getItem("atlas.workspace.v2"));
    } catch {
      return readWorkspace(null);
    }
  })();
  readonly profile = signal(this.saved.profile);
  readonly favourites = signal(this.saved.favourites);
  readonly task = signal<Task>("All tasks");
  readonly search = signal("");
  readonly view = signal("Table");
  readonly chartView = computed(
    () => this.view() === "Bars" || this.view() === "Plot",
  );
  readonly sort = signal("score");
  readonly descending = signal(true);
  readonly selected = signal<Record<string, string>>({});
  readonly preview = signal<string | null>(null);
  readonly message = signal("", { equal: () => false });
  readonly favouritesOpen = signal(false);
  readonly entered = computed(() => {
    const p = this.profile();
    return (
      !!p.gpu ||
      p.vram !== null ||
      p.bandwidth !== null
    );
  });
  readonly all = computed(() =>
    (this.api.catalog()?.artifacts ?? []).map((a) =>
      evaluate(
        this.api.release(a.releaseId)!,
        a,
        this.api.current() && !this.api.evaluating() && !this.api.error() ? (this.api.estimate(a.id)?.scenario ?? null) : null,
        this.profile(),
        this.task(),
        this.api.evaluating() ? "pending" : this.api.error() ? "failed" : this.api.current() ? "ready" : "pending",
      ),
    ),
  );
  readonly rows = computed(() =>
    (this.api.catalog()?.releases ?? []).map(
      (r) =>
        this.all().find((x) => x.a.id === this.selected()[r.id]) ??
        recommendedVariant(this.all().filter((x) => x.r.id === r.id))!,
    ),
  );
  readonly top = computed(() =>
    (this.api.catalog()?.releases ?? [])
      .map(r => recommendedVariant(this.all().filter(x => x.r.id === r.id)))
      .filter(x => !!x && (!this.entered() || x.eligible))
      .sort((a,b) => this.entered() ? compareRecommendations(a,b) :
        (b.r.downloadsLastMonth ?? 0)-(a.r.downloadsLastMonth ?? 0) || a.r.id.localeCompare(b.r.id))
      .slice(0,5)
      .map(x => this.rows().find(row => row.r.id === x.r.id)!),
  );
  readonly visible = computed(() =>
    this.rows()
      .filter((x) =>
        (x.r.name + " " + x.r.publisher)
          .toLowerCase()
          .includes(this.search().toLowerCase()) && (this.task() === 'All tasks' || x.r.tasks.includes(this.task())),
      )
      .sort((a, b) => {
        if (this.sort() === "score" && this.entered()) return compareRecommendations(a,b) * (this.descending() ? 1 : -1);
        const value = (x: typeof a): number | string | null =>
          this.sort() === "name"
            ? x.r.name
            : this.sort() === "parameters"
              ? x.r.totalParameters
              : this.sort() === "context"
                ? x.r.contextLimit
                : this.sort() === "memory"
                  ? (x.e?.totalGiB ?? null)
                  : this.sort() === "speed"
                    ? (x.speed?.typical ?? null)
                    : this.entered()
                      ? x.score
                      : x.r.downloadsLastMonth;
        const av = value(a),
          bv = value(b);
        if (av === null) return bv === null ? a.r.id.localeCompare(b.r.id) : 1;
        if (bv === null) return -1;
        return (
          (typeof av === "string"
            ? av.localeCompare(String(bv))
            : av - Number(bv)) * (this.descending() ? -1 : 1) ||
          a.r.id.localeCompare(b.r.id)
        );
      }),
  );
  constructor() {
    this.api.baseline.set(null);
    effect(() => {
      const c = this.api.catalog();
      if (c)
        untracked(() =>
          this.favourites.update((ids) =>
            ids.filter((id) => c.artifacts.some((a) => a.id === id)),
          ),
        );
    });
    effect(() => {
      const p = this.profile();
      untracked(() =>
        this.api.setHardware({
          gpuGiB: p.vram ?? 0,
          bandwidthGBps: p.bandwidth && p.bandwidth > 0 ? p.bandwidth : null,
          minimumTokensPerSecond: 0,
          ramGiB: p.ram,
          contextTokens: p.context,
          cachePrecision: "f16",
          concurrency: 1,
        }),
      );
    });
    effect(() => {
      try {
        localStorage.setItem(
          "atlas.workspace.v2",
          JSON.stringify({
            profile: this.profile(),
            favourites: this.favourites(),
          }),
        );
      } catch {
        this.message.set(
          "Local storage unavailable; this session still works.",
        );
      }
    });
  }
  patch(p: Partial<Profile>) {
    this.profile.update((v) => ({ ...v, ...p }));
  }
  gpu(name: string | null) {
    const g = GPUS.find((x) => x.name === name);
    this.patch({
      gpu: g?.name ?? '',
      vram: g?.vram ?? null,
      bandwidth: g?.bandwidth ?? null,
    });
  }
  number(key: "ram" | "context", value: string) {
    const n = value === "" ? null : Number(value) * (key === 'context' ? 1024 : 1);
    const max = key === 'ram' ? 2048 : 1048576;
    if (
      (n === null && key !== "context") ||
      (n !== null &&
        Number.isFinite(n) &&
        n >= (key === "context" ? 256 : 0) &&
        n <= max &&
        (key !== "context" || Number.isInteger(n)))
    ) {
      this.patch({ [key]: n });
      this.message.set("");
    } else this.message.set("Invalid value. Use the displayed range.");
  }
  variant(release: string, id: string) {
    if (this.preview() && this.row(this.preview()!)?.r.id === release)
      this.preview.set(id);
    this.selected.update((v) => ({ ...v, [release]: id }));
  }
  row(id: string) {
    return this.all().find((x) => x.a.id === id);
  }
  toggle(id: string) {
    if (!this.api.artifact(id)) return;
    const saved = this.favourites().includes(id);
    this.favourites.update(ids => saved ? ids.filter(x => x !== id) : [...ids, id]);
    this.message.set(saved ? "Favourite removed." : "Favourite saved. Open the Favourites rail beside the model catalog.");
  }
  order(key: string) {
    if (this.sort() === key) this.descending.update((x) => !x);
    else {
      this.sort.set(key);
      this.descending.set(true);
    }
  }
  reset() {
    this.profile.set({ ...EMPTY_PROFILE });

    this.selected.set({});
    this.search.set("");
    this.task.set("All tasks");
    this.message.set("Exploration reset.");
  }
}
