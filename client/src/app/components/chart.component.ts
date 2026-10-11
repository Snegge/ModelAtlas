import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import * as echarts from "echarts/core";
import { ScatterChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  MarkAreaComponent,
  DataZoomComponent,
  AriaComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { AtlasStore } from "../core/atlas.store";
import { Point, STATUS_LABEL, STATUS_SYMBOL, Status } from "../core/models";
echarts.use([
  ScatterChart,
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  MarkAreaComponent,
  DataZoomComponent,
  AriaComponent,
  CanvasRenderer,
]);
@Component({
  selector: "atlas-chart",
  standalone: true,
  template: `
    <section
      class="chart-panel"
      aria-labelledby="chart-title"
      [attr.aria-busy]="s.evaluating()"
    >
      <div class="panel-heading">
        <div>
          <div class="section-kicker">02 / EXPLORE THE CONSTRAINTS</div>
          <h2 id="chart-title">A map of possibilities</h2>
        </div>
        <button
          class="button small-button"
          (click)="toggleZoom()"
          [attr.aria-pressed]="zoom()"
        >
          {{ zoom() ? "Reset & exit zoom" : "Enable chart zoom" }}
        </button>
      </div>
      <div class="chart-legend">
        @for (status of statuses; track status) {
          <span [class]="'status-text ' + status"
            ><b>{{ symbols[status] }}</b
            >{{ labels[status] }}</span
          >
        }
      </div>
      <div class="chart-axis-label">
        Documented context limit · tokens · logarithmic scale (base 2)
      </div>
      <p id="chart-keyboard-help" class="sr-only">
        Use arrow keys to inspect points, Enter to select, and Escape to close
        the tooltip. The model table below offers the same selection and
        details.
      </p>
      <div
        #surface
        class="scatter-surface"
        role="group"
        tabindex="0"
        aria-describedby="chart-keyboard-help"
        (keydown)="navigate($event)"
        (focus)="showFocusedTooltip()"
        aria-label="Model constraint plot. Use arrow keys to inspect points, Enter to select and Escape to close the tooltip. Estimated full-residency memory in GiB versus documented context. An accessible model table is below."
      ></div>
      @if (s.evaluating() || !s.current()) {
        <div class="chart-updating" role="status">Updating estimates…</div>
      }
      <div class="chart-caption">
        <span
          ><b>{{ plotted() }}</b> of {{ s.visible().length }} matching releases
          plotted · one artifact per release</span
        ><span>Full GPU residency estimate → GiB</span>
      </div>
      @if (s.baseline() && s.focusedEstimate()?.baseline) {
        <p class="small focused-pair-note">
          Blue B/S outlines pair the focused
          <b>{{ s.focusedArtifact()?.quantization }}</b> artifact under baseline
          and scenario settings.
        </p>
      }
      <p class="chart-reading">
        <span class="region-swatch"></span> Shaded region meets GPU-memory and
        documented-context constraints. Offloading may make points beyond the
        GPU boundary possible.
      </p>
      @if (s.visible().length - plotted() > 0) {
        <p class="small warning">
          {{ s.visible().length - plotted() }} releases have no usable estimate
          or context coordinate. They remain accessible in the catalog.
        </p>
      }
      <p class="small muted chart-limit">
        Documented context is a model limit, not a guarantee of effective
        runtime support or quality. Ordinary filters preserve the axes.
      </p>
    </section>
  `,
})
export class ChartComponent implements AfterViewInit, OnDestroy {
  readonly s = inject(AtlasStore);
  readonly surface = viewChild.required<ElementRef<HTMLDivElement>>("surface");
  readonly zoom = signal(false);
  readonly statuses: Status[] = [
    "gpu-fit",
    "offload",
    "outside-budget",
    "unknown",
  ];
  readonly labels = STATUS_LABEL;
  readonly symbols = STATUS_SYMBOL;
  readonly plotted = computed(
    () =>
      this.s
        .visible()
        .filter(
          (p) =>
            p.scenario.totalGiB !== null &&
            (this.s.release(p.releaseId)?.contextLimit ?? 0) > 0,
        ).length,
  );
  private chart: echarts.ECharts | null = null;
  private resize?: ResizeObserver;
  private zoomStart = 0;
  private zoomEnd = 100;
  constructor() {
    effect(() => {
      this.s.visible();
      this.s.evaluation();
      this.s.focused();
      this.s.comparisons();
      this.zoom();
      if (this.chart) this.draw();
    });
  }
  ngAfterViewInit() {
    this.chart = echarts.init(this.surface().nativeElement, undefined, {
      renderer: "canvas",
    });
    this.chart.on("click", (params) => {
      const data = params.data as { releaseId?: string; artifactId?: string };
      if (data?.artifactId) this.s.focusArtifact(data.artifactId);
      else if (data?.releaseId) this.s.focusRelease(data.releaseId);
    });
    this.chart.on("datazoom", (event) => {
      const e = event as any;
      const range = e.batch?.[0] ?? e;
      if (typeof range.start === "number") this.zoomStart = range.start;
      if (typeof range.end === "number") this.zoomEnd = range.end;
    });
    this.resize = new ResizeObserver(() => this.chart?.resize());
    this.resize.observe(this.surface().nativeElement);
    this.draw();
  }
  toggleZoom() {
    this.zoom.update((v) => !v);
    if (!this.zoom()) {
      this.zoomStart = 0;
      this.zoomEnd = 100;
      this.chart?.dispatchAction({ type: "dataZoom", start: 0, end: 100 });
    }
  }
  private draw() {
    if (!this.chart) return;
    const all = this.s.points(),
      visible = this.s.visible(),
      evaluation = this.s.evaluation(),
      h = evaluation?.settings ?? this.s.hardware();
    const allTotals = all.map((p) => p.scenario.totalGiB ?? 0);
    const exact = this.s.focusedEstimate();
    const maxX =
      Math.max(
        24,
        h.gpuGiB * 1.15,
        ...allTotals,
        exact?.baseline?.totalGiB ?? 0,
      ) * 1.08;
    const contexts =
      this.s
        .catalog()
        ?.releases.map((r) => r.contextLimit ?? 0)
        .filter((c) => c > 0) ?? [];
    const maxY =
      2 ** Math.ceil(Math.log2(Math.max(32768, ...contexts, h.contextTokens)));
    const minY = 2 ** Math.floor(Math.log2(Math.min(1024, ...contexts)));
    const colors: Record<Status, string> = {
      "gpu-fit": "#26745a",
      offload: "#b47b18",
      "outside-budget": "#849096",
      unknown: "#846aa7",
    };
    const symbols: Record<Status, string> = {
      "gpu-fit": "circle",
      offload: "diamond",
      "outside-budget": "triangle",
      unknown: "rect",
    };
    const series: any[] = this.statuses.map((status) => ({
      name: STATUS_LABEL[status],
      type: "scatter",
      symbol: symbols[status],
      symbolSize: 12,
      data: visible
        .filter(
          (p) =>
            p.scenario.status === status &&
            p.scenario.totalGiB !== null &&
            this.s.release(p.releaseId)?.contextLimit,
        )
        .map((p) => ({
          value: [
            p.scenario.totalGiB,
            this.s.release(p.releaseId)!.contextLimit,
          ],
          releaseId: p.releaseId,
          artifactId: p.artifactId,
          itemStyle: {
            color: colors[status],
            opacity: this.s.focusedRelease()?.id === p.releaseId ? 1 : 0.78,
            borderColor:
              this.s.focusedRelease()?.id === p.releaseId
                ? "#102c25"
                : this.s
                      .comparisons()
                      .some(
                        (id) => this.s.artifact(id)?.releaseId === p.releaseId,
                      )
                  ? "#0e4951"
                  : "#fafbf7",
            borderWidth: this.s.focusedRelease()?.id === p.releaseId ? 3 : 1,
          },
          label: {
            show: this.s.focusedRelease()?.id === p.releaseId,
            formatter: this.s.release(p.releaseId)!.name,
            position: "top",
            color: "#173e35",
            fontSize: 11,
            backgroundColor: "#fafbf7",
            padding: 3,
          },
        })),
      emphasis: { scale: 1.4 },
      ...(status === "gpu-fit"
        ? {
            markLine: {
              silent: true,
              symbol: "none",
              lineStyle: { color: "#294e42", type: "dashed", width: 1.5 },
              label: {
                fontSize: 11,
                color: "#294e42",
                backgroundColor: "#f5f7f1",
                padding: 4,
              },
              data: [
                {
                  xAxis: h.gpuGiB,
                  label: {
                    formatter: `GPU budget · ${h.gpuGiB} GiB`,
                    position: "insideEndTop",
                  },
                },
                {
                  yAxis: h.contextTokens,
                  label: {
                    formatter: `Requested · ${h.contextTokens.toLocaleString()} tokens`,
                    position: "insideStartTop",
                  },
                },
              ],
            },
            markArea: {
              silent: true,
              itemStyle: { color: "rgba(99,156,101,.09)" },
              data: [
                [
                  { xAxis: 0, yAxis: h.contextTokens },
                  { xAxis: h.gpuGiB, yAxis: maxY },
                ],
              ],
            },
          }
        : {}),
    }));
    const focusedArtifact = this.s.focusedArtifact(),
      release = this.s.focusedRelease();
    if (
      exact?.baseline &&
      focusedArtifact &&
      release?.contextLimit &&
      exact.baseline.totalGiB !== null &&
      exact.scenario.totalGiB !== null
    ) {
      series.push({
        name: "Focused exact artifact",
        type: "scatter",
        symbol: "circle",
        symbolSize: 16,
        itemStyle: {
          color: "transparent",
          borderColor: "#294c85",
          borderWidth: 2,
        },
        data: [
          {
            value: [exact.baseline.totalGiB, release.contextLimit],
            releaseId: release.id,
            artifactId: focusedArtifact.id,
            configuration: "Baseline",
            label: {
              show: true,
              formatter: "B",
              position: "bottom",
              color: "#294c85",
            },
          },
          {
            value: [exact.scenario.totalGiB, release.contextLimit],
            releaseId: release.id,
            artifactId: focusedArtifact.id,
            configuration: "Scenario",
            label: {
              show: true,
              formatter: "S",
              position: "bottom",
              color: "#294c85",
            },
          },
        ],
        markLine: {
          silent: true,
          symbol: "none",
          label: { show: false },
          lineStyle: { color: "#294c85", type: "solid", width: 2 },
          data: [
            [
              { coord: [exact.baseline.totalGiB, release.contextLimit] },
              { coord: [exact.scenario.totalGiB, release.contextLimit] },
            ],
          ],
        },
      });
    }
    this.chart.setOption(
      {
        animation: !matchMedia("(prefers-reduced-motion: reduce)").matches,
        animationDurationUpdate: 180,
        grid: { left: 64, right: 36, top: 25, bottom: this.zoom() ? 65 : 34 },
        aria: { enabled: true },
        xAxis: {
          type: "value",
          min: 0,
          max: maxX,
          name: "",
          axisLabel: { color: "#61726b", fontSize: 11 },
          splitLine: { lineStyle: { color: "#e3e8df" } },
        },
        yAxis: {
          type: "log",
          logBase: 2,
          min: minY,
          max: maxY,
          axisLabel: {
            color: "#61726b",
            fontSize: 11,
            formatter: (v: number) => (v >= 1024 ? `${v / 1024}k` : String(v)),
          },
          splitLine: { lineStyle: { color: "#e3e8df" } },
        },
        tooltip: {
          trigger: "item",
          confine: true,
          renderMode: "richText",
          formatter: (params: any) => {
            const d = params.data,
              p = this.s.point(d.releaseId),
              r = this.s.release(d.releaseId),
              a = this.s.artifact(d.artifactId);
            return `${r?.name}\n${a?.quantization} · ${d.configuration ?? "Representative"}\n${Number(d.value[0]).toFixed(2)} GiB estimated full residency\n${r?.contextLimit?.toLocaleString()} tokens documented\n${d.configuration === "Baseline" ? STATUS_LABEL[this.s.estimate(d.artifactId)?.baseline?.status ?? "unknown"] : d.configuration === "Scenario" ? STATUS_LABEL[this.s.estimate(d.artifactId)?.scenario.status ?? "unknown"] : p ? STATUS_LABEL[p.scenario.status] : ""}\nSelect to inspect source & assumptions`;
          },
        },
        dataZoom: this.zoom()
          ? [
              {
                type: "slider",
                xAxisIndex: 0,
                bottom: 0,
                height: 18,
                start: this.zoomStart,
                end: this.zoomEnd,
              },
              { type: "inside", xAxisIndex: 0 },
            ]
          : [],
        series,
      },
      { notMerge: true },
    );
    if (document.activeElement === this.surface().nativeElement)
      this.showFocusedTooltip();
  }
  navigate(event: KeyboardEvent) {
    if (event.key === "Escape") {
      this.chart?.dispatchAction({ type: "hideTip" });
      return;
    }
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"].includes(
        event.key,
      )
    )
      return;
    event.preventDefault();
    const rows = this.s
      .visible()
      .filter(
        (p) =>
          p.scenario.totalGiB !== null &&
          this.s.release(p.releaseId)?.contextLimit,
      );
    if (!rows.length) return;
    let index = rows.findIndex(
      (p) => p.releaseId === this.s.focusedRelease()?.id,
    );
    if (event.key !== "Enter")
      index =
        (index +
          (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) +
          rows.length) %
        rows.length;
    if (index < 0) index = 0;
    this.s.focusRelease(rows[index].releaseId);
    this.showFocusedTooltip();
  }
  showFocusedTooltip() {
    const selected = this.s.point(this.s.focusedRelease()?.id ?? "");
    if (!selected) return;
    const status = selected.scenario.status;
    const rows = this.s
      .visible()
      .filter(
        (p) =>
          p.scenario.status === status &&
          p.scenario.totalGiB !== null &&
          this.s.release(p.releaseId)?.contextLimit,
      );
    const index = rows.findIndex((p) => p.releaseId === selected.releaseId);
    if (index >= 0)
      this.chart?.dispatchAction({
        type: "showTip",
        seriesIndex: this.statuses.indexOf(status),
        dataIndex: index,
      });
  }
  ngOnDestroy() {
    this.resize?.disconnect();
    this.chart?.dispose();
  }
}
