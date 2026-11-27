import { describe, it, expect } from "vitest";
import { DEFAULTS } from "../src/app/core/models";
import {
  readSession,
  defaultSession,
  pinBaseline,
  restoreBaseline,
  toggleComparison,
  csvRows,
  sameHardware,
} from "../src/app/core/session";
describe("Exploration persistence and reversibility", () => {
  it("matches restored/API hardware by values instead of JSON property order", () => {
    const restored=readSession(JSON.stringify({hardware:DEFAULTS})).hardware;
    expect(JSON.stringify(restored)).not.toBe(JSON.stringify(DEFAULTS));
    expect(sameHardware(restored,DEFAULTS)).toBe(true);
    expect(sameHardware({...restored,ramGiB:undefined},DEFAULTS)).toBe(true);
    for (const change of [{gpuGiB:24},{bandwidthGBps:936},{ramGiB:32},{contextTokens:4096},{minimumTokensPerSecond:10},{quantization:'Q8_0'}]) {
      expect(sameHardware({...restored,...change},DEFAULTS)).toBe(false);
    }
    expect(sameHardware(null,null)).toBe(true);
    expect(sameHardware(null,DEFAULTS)).toBe(false);
  });
  it("pins a copy and restores without mutating the baseline", () => {
    const h = { ...DEFAULTS };
    const baseline = pinBaseline(h);
    h.gpuGiB = 24;
    expect(baseline.gpuGiB).toBe(12);
    const restored = restoreBaseline(baseline, h);
    expect(restored).toEqual(DEFAULTS);
    restored.gpuGiB = 6;
    expect(baseline.gpuGiB).toBe(12);
  });
  it("reset returns the complete default state", () => {
    expect(defaultSession()).toEqual({
      hardware: DEFAULTS,
      baseline: null,
      filters: {
        search: "",
        family: "",
        quantization: "",
        fitsOnly: false,
        sort: "memory",
      },
      comparisons: [],
      focused: null,
    });
  });
  it("keeps the first three comparisons and requires explicit removal", () => {
    const ids = ["one", "two", "three"];
    const result = toggleComparison(ids, "four");
    expect(result.ids).toEqual(ids);
    expect(result.limited).toBe(true);
    expect(
      toggleComparison(toggleComparison(ids, "two").ids, "four").ids,
    ).toEqual(["one", "three", "four"]);
  });
  it("recovers from corrupt and out-of-range storage", () => {
    expect(readSession("{")).toEqual(defaultSession());
    expect(
      readSession(
        JSON.stringify({
          hardware: { ...DEFAULTS, gpuGiB: -5 },
          baseline: { ...DEFAULTS, contextTokens: 0 },
        }),
      ).hardware,
    ).toEqual(DEFAULTS);
  });
  it("preserves filters, focus and comparisons through a valid reload", () => {
    const state = defaultSession();
    state.focused = "artifact";
    state.comparisons = ["artifact"];
    state.filters.search = "Qwen";
    state.baseline = pinBaseline(DEFAULTS);
    expect(readSession(JSON.stringify(state))).toEqual(state);
  });
  it("exports exact units, values and safely quoted source metadata", () => {
    const csv = csvRows(
      ["GPU_budget_GiB", "requested_context_tokens", "source"],
      [
        [12, 8192, "https://example.org/a,b"],
        [24, 16384, "=FORMULA()"],
      ],
    );
    expect(csv).toContain('"12","8192","https://example.org/a,b"');
    expect(csv).toContain('"\'=FORMULA()"');
  });
});
