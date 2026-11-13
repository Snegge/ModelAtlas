import { describe, it, expect } from "vitest";
import {
  score,
  fixture,
  evaluate,
  EMPTY_PROFILE,
  readWorkspace,
  GPUS,
} from "../src/app/workspace/ranking";
import { Release, Artifact, Estimate } from "../src/app/core/models";
const r = { id: "test", contextLimit: 32768 } as Release;
const a = { id: "q4", sizeBytes: 4 * 2 ** 30 } as Artifact;
const e = {
  status: "gpu-fit",
  weightsGiB: 4,
  cacheGiB: 1,
  totalGiB: 6,
} as Estimate;
describe("shared ranking contract", () => {
  it("has no default personal hardware", () =>
    expect(readWorkspace(null).profile).toEqual(EMPTY_PROFILE));
  it("rejects corrupt stored hardware and deduplicates variants", () => {
    expect(readWorkspace("{").profile.vram).toBeNull();
    expect(
      readWorkspace(
        JSON.stringify({
          profile: { vram: -1 },
          comparisons: ["a", "a", "b", "c", "d"],
        }),
      ).favourites,
    ).toEqual(["a", "b", "c", "d"]);
  });
  it("restores unlimited favourites and respects an explicitly empty new list", () => {
    const ids = Array.from({ length: 100 }, (_, i) => "id-" + i);
    expect(readWorkspace(JSON.stringify({ favourites: [...ids, ids[0], null, 1] })).favourites).toEqual(ids);
    expect(readWorkspace(JSON.stringify({ favourites: [], comparisons: ["old"] })).favourites).toEqual([]);
  });
  it("uses fixed weighted normalization and preserves unknowns", () => {
    expect(score(80, 60, 100)).toEqual({ value: 80, coverage: 100 });
    expect(score(null, null, 100).value).toBeNull();
    expect(score(80, null, 100)).toEqual({ value: 87, coverage: 75 });
  });
  it("does not recommend incomplete or CPU-only profiles", () => {
    expect(evaluate(r, a, e, EMPTY_PROFILE, "Coding").eligible).toBe(false);
    expect(
      evaluate(
        r,
        a,
        e,
        { ...EMPTY_PROFILE, gpu: "CPU-only", vram: 0, ram: 48 },
        "Coding",
      ).score,
    ).toBeNull();
  });
  it("excludes incompatible candidates even with quality data", () => {
    const p = { ...EMPTY_PROFILE, vram: 12, ram: 48 };
    expect(
      evaluate(r, a, { ...e, status: "outside-budget" }, p, "Coding").eligible,
    ).toBe(false);
  });
  it("keeps offloading speed unknown", () => {
    const x = evaluate(
      r,
      a,
      { ...e, status: "offload" },
      { ...EMPTY_PROFILE, vram: 12, ram: 48, bandwidth: 360, offload: true },
      "Coding",
    );
    expect(x.eligible).toBe(true);
    expect(x.speed).toBeNull();
    expect(x.coverage).toBe(75);
  });
  it("responds to variant residency without changing release fixture", () => {
    const p = { ...EMPTY_PROFILE, vram: 24, ram: 128, bandwidth: 936 };
    const x = evaluate(r, a, e, p, "Coding"),
      y = evaluate(r, { ...a, id: "q8" }, { ...e, weightsGiB: 8 }, p, "Coding");
    expect(y.speed!.high).toBeLessThan(x.speed!.high);
    expect(y.q).toBe(x.q);
    expect(fixture(r.id)).toEqual(fixture(r.id));
  });
  it("defines both reproducible GPU profiles", () =>
    expect(GPUS.map((x) => [x.vram, x.bandwidth])).toEqual([
      [12, 360],
      [24, 936],
    ]));
});
