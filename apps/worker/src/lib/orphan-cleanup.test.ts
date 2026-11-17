import { describe, expect, test } from "bun:test";

import { planOrphans } from "./orphan-cleanup";

const now = Date.parse("2026-11-17T12:00:00Z");
const HOUR = 3_600_000;
const object = (key: string, agoHours = 5) => ({
  key,
  lastModified: now - agoHours * HOUR,
});

describe("planOrphans", () => {
  test("an object no row names is an orphan", () => {
    const plan = planOrphans({
      objects: [object("collection-images/a.webp"), object("collection-images/b.webp")],
      activeKeys: new Set(["collection-images/a.webp"]),
      rowCopyKeys: new Set(),
      now,
    });
    expect(plan).toEqual({ ok: true, orphans: ["collection-images/b.webp"], tooNew: 0 });
  });

  test("an object modified in the last 2 hours is never listed", () => {
    const plan = planOrphans({
      objects: [object("collection-images/new.webp", 1), object("collection-images/old.webp", 3)],
      activeKeys: new Set(),
      rowCopyKeys: new Set(),
      now,
    });
    expect(plan).toEqual({ ok: true, orphans: ["collection-images/old.webp"], tooNew: 1 });
  });

  test("refuses when the media prefix has objects but no row names a copy", () => {
    const plan = planOrphans({
      objects: [object("collection-media/motion/a.mp4"), object("collection-images/a.webp")],
      activeKeys: new Set(["collection-images/a.webp", "collection-media/motion/a.mp4"]),
      rowCopyKeys: new Set(),
      now,
    });
    expect(plan.ok).toBe(false);
  });

  test("an empty media prefix is fine", () => {
    const plan = planOrphans({
      objects: [object("collection-images/a.webp")],
      activeKeys: new Set(),
      rowCopyKeys: new Set(),
      now,
    });
    expect(plan.ok).toBe(true);
  });

  test("a media copy a row names passes the guard", () => {
    const plan = planOrphans({
      objects: [object("collection-media/motion/a.mp4"), object("collection-media/motion/b.mp4")],
      activeKeys: new Set(["collection-media/motion/a.mp4"]),
      rowCopyKeys: new Set(["collection-media/motion/a.mp4"]),
      now,
    });
    expect(plan).toEqual({ ok: true, orphans: ["collection-media/motion/b.mp4"], tooNew: 0 });
  });
});
