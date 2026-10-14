import { Injectable, computed, effect, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { toObservable, takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { catchError, forkJoin, of, switchMap, tap, timer } from "rxjs";
import {
  Artifact,
  Catalog,
  Coverage,
  DEFAULTS,
  EMPTY_FILTERS,
  Evaluation,
  Filters,
  Hardware,
  STATUS_LABEL,
  Point,
} from "./models";
import {
  STORAGE_KEY,
  csvRows,
  pinBaseline,
  readSession,
  restoreBaseline,
  toggleComparison,
  validHardware,
} from "./session";

@Injectable({ providedIn: "root" })
export class AtlasStore {
  private http = inject(HttpClient);
  private saved = this.load();
  readonly hardware = signal<Hardware>(this.saved.hardware);
  readonly baseline = signal<Hardware | null>(this.saved.baseline);
  readonly filters = signal<Filters>(this.saved.filters);
  readonly comparisons = signal<string[]>(this.saved.comparisons);
  readonly focused = signal<string | null>(this.saved.focused);
  readonly catalog = signal<Catalog | null>(null);
  readonly coverage = signal<Coverage | null>(null);
  readonly evaluation = signal<Evaluation | null>(null);
  readonly loading = signal(true);
  readonly evaluating = signal(false);
  readonly error = signal("");
  readonly notice = signal("");
  readonly storageAvailable = signal(true);
  private request = computed(() => ({
    settings: this.hardware(),
    baseline: this.baseline(),
    loaded: !!this.catalog(),
  }));
  readonly current = computed(
    () =>
      !!this.evaluation() &&
      JSON.stringify(this.evaluation()!.settings) ===
        JSON.stringify(this.hardware()) &&
      JSON.stringify(this.evaluation()!.baseline) ===
        JSON.stringify(this.baseline()),
  );
  readonly points = computed(() => this.evaluation()?.releases ?? []);
  readonly families = computed(() =>
    [...new Set(this.catalog()?.releases.map((r) => r.family))].sort(),
  );
  readonly visible = computed(() => {
    const c = this.catalog(),
      f = this.filters();
    if (!c) return [];
    const rows = this.points().filter((p) => {
      const r = c.releases.find((r) => r.id === p.releaseId)!;
      return (
        (r.name + " " + r.publisher)
          .toLowerCase()
          .includes(f.search.trim().toLowerCase()) &&
        (!f.family || r.family === f.family) &&
        (!f.quantization ||
          c.artifacts.some(
            (a) => a.releaseId === r.id && a.quantization === f.quantization,
          )) &&
        (!f.fitsOnly || p.scenario.status === "gpu-fit")
      );
    });
    return rows.sort((a, b) => {
      const ra = this.release(a.releaseId)!,
        rb = this.release(b.releaseId)!;
      if (f.sort === "name") return ra.name.localeCompare(rb.name);
      if (f.sort === "context")
        return (rb.contextLimit ?? -1) - (ra.contextLimit ?? -1);
      if (f.sort === "parameters")
        return (
          (ra.totalParameters ?? Infinity) - (rb.totalParameters ?? Infinity)
        );
      return (
        (a.scenario.totalGiB ?? Infinity) - (b.scenario.totalGiB ?? Infinity) ||
        ra.name.localeCompare(rb.name)
      );
    });
  });
  readonly focusedArtifact = computed(() => this.artifact(this.focused()));
  readonly focusedRelease = computed(() =>
    this.release(this.focusedArtifact()?.releaseId),
  );
  readonly focusedEstimate = computed(() =>
    this.evaluation()?.artifacts.find((a) => a.artifactId === this.focused()),
  );
  readonly focusedVisible = computed(() =>
    this.visible().some((p) => p.releaseId === this.focusedRelease()?.id),
  );
  readonly changes = computed(() => ({
    gained: this.points().filter((p) => p.change === "gained").length,
    lost: this.points().filter((p) => p.change === "lost").length,
    uncertain: this.points().filter((p) => p.change === "uncertain").length,
    switched: this.points().filter((p) => p.representativeChanged).length,
  }));
  readonly hasFilters = computed(() => {
    const f = this.filters();
    return !!(f.search || f.family || f.quantization || f.fitsOnly);
  });
  constructor() {
    this.fetchCatalog();
    toObservable(this.request)
      .pipe(
        tap((r) => {
          if (r.loaded) this.evaluating.set(true);
        }),
        switchMap((r) =>
          !r.loaded
            ? of(null)
            : timer(180).pipe(
                switchMap(() =>
                  this.http.post<Evaluation>(
                    r.baseline ? "/api/scenarios" : "/api/evaluate",
                    { settings: r.settings, baseline: r.baseline },
                  ),
                ),
                catchError(() => {
                  this.error.set(
                    "Evaluation failed. Check that the backend is running, then retry.",
                  );
                  this.evaluating.set(false);
                  return of(null);
                }),
              ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (!result) return;
        this.evaluation.set(result);
        this.evaluating.set(false);
        this.error.set("");
        if (!this.focusedArtifact()) {
          const point =
            result.releases.find((p) =>
              this.release(p.releaseId)?.name.includes("Qwen2.5-7B-Instruct"),
            ) ??
            result.releases.find((p) => p.scenario.status === "gpu-fit") ??
            result.releases[0];
          if (point) this.focused.set(point.artifactId);
        }
      });
    effect(() => {
      const state = {
        hardware: this.hardware(),
        baseline: this.baseline(),
        filters: this.filters(),
        comparisons: this.comparisons(),
        focused: this.focused(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        this.storageAvailable.set(false);
      }
    });
  }
  private load() {
    try {
      return readSession(localStorage.getItem(STORAGE_KEY));
    } catch {
      return readSession(null);
    }
  }
  fetchCatalog() {
    this.loading.set(true);
    this.error.set("");
    forkJoin({
      catalog: this.http.get<Catalog>("/api/catalog"),
      coverage: this.http.get<Coverage>("/api/catalog/status"),
    }).subscribe({
      next: ({ catalog, coverage }) => {
        this.catalog.set(catalog);
        this.coverage.set(coverage);
        this.comparisons.update((ids) =>
          ids.filter((id) => catalog.artifacts.some((a) => a.id === id)),
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(
          "The catalog is unavailable. Start the ASP.NET backend on port 5050 and retry.",
        );
      },
    });
  }
  retry() {
    this.catalog.set(null);
    this.fetchCatalog();
  }
  release(id: string | undefined | null) {
    return this.catalog()?.releases.find((r) => r.id === id);
  }
  artifact(id: string | undefined | null) {
    return this.catalog()?.artifacts.find((a) => a.id === id);
  }
  point(id: string) {
    return this.points().find((p) => p.releaseId === id);
  }
  estimate(id: string) {
    return this.evaluation()?.artifacts.find((a) => a.artifactId === id);
  }
  variants(id: string) {
    return (
      this.catalog()?.artifacts.filter((a) => a.releaseId === id) ?? []
    ).sort((a, b) => a.sizeBytes - b.sizeBytes);
  }
  label = STATUS_LABEL;
  setHardware(patch: Partial<Hardware>) {
    const next = { ...this.hardware(), ...patch };
    if (validHardware(next)) {
      this.hardware.set(next);
      this.notice.set("");
    } else
      this.notice.set("Use valid hardware values within the labelled limits.");
  }
  setFilter(patch: Partial<Filters>) {
    this.filters.update((f) => ({ ...f, ...patch }));
  }
  clearFilters() {
    this.filters.set({ ...EMPTY_FILTERS });
  }
  pin() {
    this.baseline.set(pinBaseline(this.hardware()));
    this.notice.set("Baseline pinned. Changes now apply to the scenario.");
  }
  restore() {
    this.hardware.set(restoreBaseline(this.baseline(), this.hardware()));
    this.notice.set("Baseline settings restored.");
  }
  clearBaseline() {
    this.baseline.set(null);
    this.notice.set("Baseline cleared.");
  }
  reset() {
    this.hardware.set({ ...DEFAULTS });
    this.baseline.set(null);
    this.clearFilters();
    this.comparisons.set([]);
    this.focused.set(null);
    this.notice.set(
      "Default settings restored; baseline, filters and comparison cleared.",
    );
  }
  focusRelease(id: string) {
    const p = this.point(id);
    if (p) this.focused.set(p.artifactId);
  }
  focusArtifact(id: string) {
    if (this.artifact(id)) this.focused.set(id);
  }
  toggleCompare(id: string) {
    const result = toggleComparison(this.comparisons(), id);
    this.comparisons.set(result.ids);
    this.notice.set(
      result.limited
        ? "Compare up to three exact artifacts. Remove one in the comparison tray before adding another."
        : result.ids.includes(id)
          ? "Exact artifact added to comparison."
          : "Artifact removed from comparison.",
    );
  }
  isOutside(id: string) {
    return !this.visible().some(
      (p) => p.releaseId === this.artifact(id)?.releaseId,
    );
  }
  explanation(id: string): string[] {
    const e = this.estimate(id),
      a = this.artifact(id),
      evaluation = this.evaluation();
    if (!e || !a || !evaluation) return [];
    const before = evaluation.baseline,
      now = evaluation.settings;
    const lines: string[] = [];
    if (
      e.baseline &&
      before &&
      e.scenario.cacheGiB !== null &&
      e.baseline.cacheGiB !== null
    ) {
      const diff = e.scenario.cacheGiB - e.baseline.cacheGiB;
      if (Math.abs(diff) > 0.0001) {
        const changed = [
          before.contextTokens !== now.contextTokens
            ? `context ${before.contextTokens.toLocaleString()} → ${now.contextTokens.toLocaleString()} tokens`
            : "",
          before.cachePrecision !== now.cachePrecision
            ? `cache precision ${before.cachePrecision.toUpperCase()} → ${now.cachePrecision.toUpperCase()}`
            : "",
          before.concurrency !== now.concurrency
            ? `concurrent sequences ${before.concurrency} → ${now.concurrency}`
            : "",
        ].filter(Boolean);
        lines.push(
          `Changing ${changed.join(", ")} ${diff < 0 ? "reduces" : "increases"} estimated cache memory by ${Math.abs(diff).toFixed(2)} GiB for this same artifact.`,
        );
      }
      if (
        Math.abs((e.scenario.totalGiB ?? 0) - (e.baseline.totalGiB ?? 0)) <
          0.0001 &&
        now.gpuGiB !== before.gpuGiB
      )
        lines.push(
          "Changing the GPU budget changes fit, not the artifact’s memory requirement.",
        );
    }
    const fitting = this.variants(a.releaseId).find(
      (v) => this.estimate(v.id)?.scenario.status === "gpu-fit",
    );
    if (fitting && fitting.id !== id && e.scenario.status !== "gpu-fit")
      lines.push(
        `An available ${fitting.quantization} artifact is an estimated GPU fit; this ${a.quantization} artifact is not.`,
      );
    const p = this.point(a.releaseId);
    if (p?.representativeChanged)
      lines.push(
        `The overview representative changed from ${this.artifact(p.baselineArtifactId)?.quantization} to ${this.artifact(p.artifactId)?.quantization}. The bars here evaluate the same exact artifact in both configurations.`,
      );
    return lines;
  }
  exportCsv() {
    if (!this.current() || !this.evaluation()) return;
    const h = this.evaluation()!.settings,
      b = this.evaluation()!.baseline;
    const headers = [
      "model_release",
      "publisher",
      "family",
      "artifact_id",
      "artifact_repository",
      "artifact_revision",
      "quantization",
      "artifact_size_bytes",
      "artifact_files",
      "documented_context_tokens",
      "context_metadata_source",
      "license",
      "estimate_label",
      "estimated_weights_GiB",
      "estimated_KV_cache_GiB",
      "estimated_runtime_GiB",
      "estimated_safety_GiB",
      "estimated_total_GiB",
      "estimated_GPU_residency_GiB",
      "estimated_RAM_requirement_GiB",
      "GPU_budget_GiB",
      "RAM_budget_GiB",
      "requested_context_tokens",
      "cache_precision",
      "concurrency",
      "offloading_allowed",
      "quantization_preference",
      "baseline_GPU_GiB",
      "baseline_RAM_GiB",
      "baseline_context_tokens",
      "baseline_cache_precision",
      "baseline_concurrency",
      "baseline_offloading",
      "baseline_quantization",
      "same_artifact_baseline_total_GiB",
      "same_artifact_baseline_label",
      "model_card_source",
      "artifact_source",
      "retrieved_at",
      "estimator_version",
      "runtime_compatibility",
      "reasons",
    ];
    const rows = this.visible().map((p) => {
      const r = this.release(p.releaseId)!,
        a = this.artifact(p.artifactId)!,
        e = p.scenario,
        exact = this.estimate(a.id)?.baseline;
      return [
        r.releaseIdentifier,
        r.publisher,
        r.family,
        a.id,
        a.repository,
        a.revision,
        a.quantization,
        a.sizeBytes,
        a.files.map((f) => f.path).join(";"),
        r.contextLimit,
        r.contextSource,
        r.license,
        STATUS_LABEL[e.status],
        e.weightsGiB,
        e.cacheGiB,
        e.runtimeGiB,
        e.safetyGiB,
        e.totalGiB,
        e.gpuRequiredGiB,
        e.systemRequiredGiB,
        h.gpuGiB,
        h.ramGiB,
        h.contextTokens,
        h.cachePrecision,
        h.concurrency,
        h.allowOffload,
        h.quantization,
        b?.gpuGiB,
        b?.ramGiB,
        b?.contextTokens,
        b?.cachePrecision,
        b?.concurrency,
        b?.allowOffload,
        b?.quantization,
        exact?.totalGiB,
        exact ? STATUS_LABEL[exact.status] : "",
        r.modelCardUrl,
        a.sourceUrl,
        a.retrievedAt,
        e.estimatorVersion,
        e.runtimeCompatibility,
        e.reasons.join(";"),
      ];
    });
    const blob = new Blob(["\uFEFF" + csvRows(headers, rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = "model-atlas-estimates.csv";
    link.click();
    URL.revokeObjectURL(url);
    this.notice.set(
      `Exported ${rows.length} visible release representatives with settings and source links.`,
    );
  }
}
