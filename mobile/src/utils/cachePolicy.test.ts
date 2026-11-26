import { describe, expect, it } from "vitest";
import { selectCacheKeysToRemove } from "./cachePolicy";

const MAX_AGE = 30 * 24 * 60 * 60 * 1000;

describe("selectCacheKeysToRemove", () => {
  it("removes expired entries", () => {
    const now = 1_000_000_000;
    const result = selectCacheKeysToRemove(
      [
        { key: "fresh", fetchedAt: now - 1000 },
        { key: "old", fetchedAt: now - MAX_AGE - 1 },
      ],
      { maxEntries: 10, maxAgeMs: MAX_AGE, now },
    );

    expect(result).toEqual(["old"]);
  });

  it("removes corrupted timestamps", () => {
    const result = selectCacheKeysToRemove(
      [
        { key: "nan", fetchedAt: Number.NaN },
        { key: "future", fetchedAt: Date.now() + 60_000 },
        { key: "ok", fetchedAt: Date.now() },
      ],
      { maxEntries: 10, maxAgeMs: MAX_AGE },
    );

    expect(result.sort()).toEqual(["future", "nan"]);
  });

  it("removes the oldest entries above the limit", () => {
    const now = 1_000_000_000;
    const result = selectCacheKeysToRemove(
      [
        { key: "newest", fetchedAt: now - 1 },
        { key: "oldest", fetchedAt: now - 4 },
        { key: "middle", fetchedAt: now - 3 },
        { key: "second", fetchedAt: now - 2 },
      ],
      { maxEntries: 2, maxAgeMs: MAX_AGE, now },
    );

    expect(result.sort()).toEqual(["middle", "oldest"]);
  });

  it("keeps everything when the cache is within limits", () => {
    const now = 1_000_000_000;
    const result = selectCacheKeysToRemove(
      [
        { key: "a", fetchedAt: now - 1 },
        { key: "b", fetchedAt: now - 2 },
      ],
      { maxEntries: 40, maxAgeMs: MAX_AGE, now },
    );

    expect(result).toEqual([]);
  });
});
