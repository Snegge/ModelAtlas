import { GPUS } from '../core/gpus';
import { Estimate, Release, Artifact } from "../core/models";
export const TASKS = ["All tasks", "Chat", "Coding", "Reasoning", "Agentic"] as const;
export const SCORE_HINT = 'Quality 45% · GPU fit 25% · Speed 15% · VRAM use 15%. Requires full GPU fit.';
export type Task = (typeof TASKS)[number];
export interface Profile {
  gpu: string;
  vram: number | null;
  bandwidth: number | null;
  context: number;
  ram: number | null;
}
export const EMPTY_PROFILE: Profile = { gpu: "", vram: null, bandwidth: null, context: 8192, ram: null };
export { GPUS, contextK } from '../core/gpus';
export function quality(r: Release, task?: string) {
  if (task === 'IFEval' || task === 'MMLU-Pro') return r.referenceQuality ? 100 * r.referenceQuality.values[task === 'IFEval' ? 0 : 1] : null;
  return r.qualityRating.score;
}
export function evaluate(r: Release, a: Artifact, e: Estimate | null, p: Profile, task: Task,
  evaluationState: "pending" | "failed" | "ready" = "pending") {
  const entered = !!p.gpu || p.vram !== null || p.bandwidth !== null;
  const status = entered && p.vram !== null && e ? e.status : "unknown";
  const speed = status === "gpu-fit" && p.bandwidth ? e?.speed ?? null : null;
  const q = r.qualityRating.score;
  const eligible = status === "gpu-fit" && !!speed && e?.eligible === true;
  const speedMessage = p.vram === null ? "Select a GPU" :
    status === "outside-budget" ? (e?.contextSatisfied === false ? "Context limit exceeded" : "Insufficient VRAM") :
    !p.bandwidth ? "Enter GPU memory bandwidth" :
    !e ? (evaluationState === "pending" ? "Calculating…" : "Calculation unavailable — retry") :
    speed ? "Estimated generation speed" : "Estimate unavailable";
  const score = status === "outside-budget" || (speed && !eligible) ? 0 :
    eligible && e?.suitabilityScore != null ? Math.round(e.suitabilityScore) : null;
  const scoreText = score !== null ? `${score} / 100` :
    speedMessage === "Calculating…" ? "Calculating…" : "Not assessed";
  const assessmentMessage = speed && eligible ? "Fits fully in GPU memory (estimated)." :
    speed ? `This configuration does not meet the requested constraints.` :
    (status === "outside-budget" || e?.status === "unknown") && e?.reasons?.length ? e.reasons.join(" ") : speedMessage;
  const vramPercent = p.vram && e?.totalGiB != null ? Math.round(100 * e.totalGiB / p.vram) : null;
  const speedText = speed ? (speed.typical < 1 ? '< 1' : `~${Math.round(speed.typical)}`) : speedMessage;
  return { r, a, e, status, q, speed, entered, speedText, vramPercent, fillPercent: Math.min(100, vramPercent ?? 0),
    score, scoreText, speedMessage, assessmentMessage, eligible,
  };
}
export type Row = ReturnType<typeof evaluate>;
// Rank exact composite scores; deterministic speed and identity tie breaks.
export function compareRecommendations(a: Row, b: Row) {
  return Number(b.eligible) - Number(a.eligible) ||
    (b.e?.suitabilityScore ?? -1) - (a.e?.suitabilityScore ?? -1) ||
    (b.speed?.typical ?? -1) - (a.speed?.typical ?? -1) ||
    a.r.id.localeCompare(b.r.id);
}
export function recommendedVariant(rows: Row[]) {
  return [...rows].sort((a,b) => Number(b.eligible)-Number(a.eligible) ||
    (b.e?.suitabilityScore ?? -1)-(a.e?.suitabilityScore ?? -1) ||
    Number(b.status === "gpu-fit")-Number(a.status === "gpu-fit") ||
    (b.speed?.typical ?? -1)-(a.speed?.typical ?? -1) || a.a.sizeBytes-b.a.sizeBytes || a.a.id.localeCompare(b.a.id))[0];
}
export function readWorkspace(raw: string | null) {
  const empty = { profile: { ...EMPTY_PROFILE }, favourites: [] as string[] };
  try {
    const s = JSON.parse(raw || "null");
    if (!s || typeof s !== "object") return empty;
    const p = s.profile;
    if (p && typeof p.gpu === 'string' && Number.isInteger(p.context) && p.context >= 256 && p.context <= 1048576) {
      const gpu = GPUS.find(g => g.name === p.gpu);
      empty.profile = {gpu:gpu?.name ?? '', vram:gpu?.vram ?? null, bandwidth:gpu?.bandwidth ?? null,
        context:p.context, ram:typeof p.ram === 'number' && Number.isFinite(p.ram) && p.ram>=0 && p.ram<=2048 ? p.ram : null};
    }
    const saved = Array.isArray(s.favourites) ? s.favourites : s.comparisons;
    if (Array.isArray(saved)) empty.favourites = [...new Set(saved.filter((x: unknown) => typeof x === "string" && x.length > 0))] as string[];
    return empty;
  } catch { return empty; }
}
