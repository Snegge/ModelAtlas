import { Estimate, Release, Artifact } from "../core/models";
export const TASKS = [
  "All tasks",
  "Coding",
  "Writing",
  "Reasoning",
  "Agentic",
] as const;
export type Task = (typeof TASKS)[number];
export interface Profile {
  gpu: string;
  vram: number | null;
  bandwidth: number | null;
  ram: number | null;
  cpu: string;
  offload: boolean;
  context: number;
}
export const EMPTY_PROFILE: Profile = {
  gpu: "",
  vram: null,
  bandwidth: null,
  ram: null,
  cpu: "",
  offload: false,
  context: 8192,
};
export const GPUS = [
  {
    name: "NVIDIA GeForce RTX 3060 · 12 GB",
    vram: 12,
    bandwidth: 360,
    source:
      "https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3060-3060ti/",
  },
  {
    name: "NVIDIA GeForce RTX 3090 · 24 GB",
    vram: 24,
    bandwidth: 936,
    source:
      "https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3090/",
  },
];
export const WEIGHTS = { quality: 0.5, speed: 0.25, fit: 0.25 };
// Synthetic fixtures, NOT benchmarks or observed popularity. Stable across search and views.
export function fixture(id: string) {
  let n = 0;
  for (const c of id) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return {
    popularity: n % 1000,
    quality: [0, 1, 2, 3].map((i) => 45 + ((n >>> i) % 46)),
  };
}
export function quality(id: string, task: Task) {
  const q = fixture(id).quality;
  return task === "All tasks"
    ? q.reduce((a, b) => a + b) / 4
    : q[TASKS.indexOf(task) - 1];
}
export function score(
  quality: number | null,
  speed: number | null,
  fit: number | null,
) {
  const values = [quality, speed, fit],
    weights = Object.values(WEIGHTS);
  let sum = 0,
    covered = 0;
  values.forEach((v, i) => {
    if (v !== null) {
      sum += v * weights[i];
      covered += weights[i];
    }
  });
  return {
    value: covered >= 0.5 && fit !== null ? Math.round(sum / covered) : null,
    coverage: Math.round(covered * 100),
  };
}
export function evaluate(
  r: Release,
  a: Artifact,
  e: Estimate | null,
  p: Profile,
  task: Task,
) {
  const entered =
    !!p.gpu ||
    p.vram !== null ||
    p.bandwidth !== null ||
    p.ram !== null ||
    !!p.cpu;
  const incomplete = p.vram === null || p.ram === null || p.gpu === "CPU-only";
  const status = !entered || incomplete || !e ? "unknown" : e.status;
  if (e && (!entered || incomplete))
    e = {
      ...e,
      status: "unknown",
      gpuRequiredGiB: null,
      systemRequiredGiB: null,
      reasons: [
        p.gpu === "CPU-only"
          ? "CPU-only estimation is unsupported."
          : "Supply VRAM and system RAM to assess placement.",
      ],
    };
  const q = quality(r.id, task);
  const bound =
    status === "gpu-fit" && p.bandwidth && e?.weightsGiB && e.cacheGiB !== null
      ? (p.bandwidth * 1e9) / ((e.weightsGiB + e.cacheGiB) * 2 ** 30)
      : null;
  const speed =
    bound === null
      ? null
      : { low: Math.floor(bound * 0.1), high: Math.floor(bound * 0.35) };
  const fit =
    status === "gpu-fit"
      ? 100
      : status === "offload"
        ? 55
        : status === "outside-budget"
          ? 0
          : null;
  const speedScore = speed
    ? Math.min(100, ((speed.low + speed.high) / 2 / 50) * 100)
    : null;
  const result = score(q, speedScore, fit);
  return {
    r,
    a,
    e,
    status,
    q,
    speed,
    fit,
    speedScore,
    score: result.value,
    coverage: result.coverage,
    entered,
    eligible: status === "gpu-fit" || status === "offload",
  };
}
export type Row = ReturnType<typeof evaluate>;
export function readWorkspace(raw: string | null) {
  const empty = { profile: { ...EMPTY_PROFILE }, favourites: [] as string[] };
  try {
    const s = JSON.parse(raw || "null");
    if (!s || typeof s !== "object") return empty;
    const p = s.profile;
    if (
      p &&
      typeof p.gpu === "string" &&
      typeof p.cpu === "string" &&
      typeof p.offload === "boolean" &&
      Number.isInteger(p.context) &&
      p.context >= 256 &&
      p.context <= 1048576 &&
      [
        ["vram", 192],
        ["ram", 1024],
        ["bandwidth", 10000],
      ].every(
        ([k, max]) =>
          p[k] === null ||
          (typeof p[k] === "number" &&
            Number.isFinite(p[k]) &&
            p[k] >= 0 &&
            p[k] <= Number(max)),
      )
    )
      empty.profile = p;
    const saved = Array.isArray(s.favourites) ? s.favourites : s.comparisons;
    if (Array.isArray(saved))
      empty.favourites = [...new Set(saved.filter((x: unknown) => typeof x === "string" && x.length > 0))] as string[];
    return empty;
  } catch {
    return empty;
  }
}
