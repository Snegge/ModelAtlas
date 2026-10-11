import { DEFAULTS, EMPTY_FILTERS, Hardware, Filters } from "./models";
export interface Session {
  hardware: Hardware;
  baseline: Hardware | null;
  filters: Filters;
  comparisons: string[];
  focused: string | null;
}
export const STORAGE_KEY = "model-atlas.session.v1";
export function validHardware(v: unknown): v is Hardware {
  const h = v as Hardware;
  return (
    !!h &&
    Number.isFinite(h.gpuGiB) &&
    h.gpuGiB >= 0 &&
    h.gpuGiB <= 192 &&
    Number.isFinite(h.ramGiB) &&
    h.ramGiB >= 1 &&
    h.ramGiB <= 1024 &&
    Number.isInteger(h.contextTokens) &&
    h.contextTokens >= 256 &&
    h.contextTokens <= 1048576 &&
    ["Q4_K_M", "Q5_K_M", "Q8_0", "smallest"].includes(h.quantization) &&
    typeof h.allowOffload === "boolean" &&
    ["f16", "f32"].includes(h.cachePrecision) &&
    Number.isInteger(h.concurrency) &&
    h.concurrency >= 1 &&
    h.concurrency <= 8
  );
}
export function defaultSession(): Session {
  return {
    hardware: { ...DEFAULTS },
    baseline: null,
    filters: { ...EMPTY_FILTERS },
    comparisons: [],
    focused: null,
  };
}
export function readSession(raw: string | null): Session {
  if (!raw) return defaultSession();
  try {
    const s = JSON.parse(raw);
    const d = defaultSession();
    return {
      hardware: validHardware(s.hardware) ? s.hardware : d.hardware,
      baseline: validHardware(s.baseline) ? s.baseline : null,
      filters: {
        search: typeof s.filters?.search === "string" ? s.filters.search : "",
        family: typeof s.filters?.family === "string" ? s.filters.family : "",
        quantization: ["", "Q4_K_M", "Q5_K_M", "Q8_0"].includes(
          s.filters?.quantization,
        )
          ? s.filters.quantization
          : "",
        fitsOnly: s.filters?.fitsOnly === true,
        sort: ["memory", "name", "context", "parameters"].includes(
          s.filters?.sort,
        )
          ? s.filters.sort
          : "memory",
      },
      comparisons: Array.isArray(s.comparisons)
        ? ([
            ...new Set(
              s.comparisons.filter((id: unknown) => typeof id === "string"),
            ),
          ].slice(0, 3) as string[])
        : [],
      focused: typeof s.focused === "string" ? s.focused : null,
    };
  } catch {
    return defaultSession();
  }
}
export function toggleComparison(
  ids: string[],
  id: string,
): { ids: string[]; limited: boolean } {
  if (ids.includes(id))
    return { ids: ids.filter((x) => x !== id), limited: false };
  return ids.length === 3
    ? { ids, limited: true }
    : { ids: [...ids, id], limited: false };
}
export function pinBaseline(h: Hardware): Hardware {
  return { ...h };
}
export function restoreBaseline(
  b: Hardware | null,
  current: Hardware,
): Hardware {
  return { ...(b ?? current) };
}
export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Quoting and a leading apostrophe prevent spreadsheet formula interpretation in imported metadata.
  return (
    '"' +
    (/^[=+@\-]/.test(text) ? "'" + text : text).replaceAll('"', '""') +
    '"'
  );
}
export function csvRows(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}
