import { db } from "@repo/db";
import { collectionOverride } from "@repo/db/schema";

import { copyServes } from "./collection-override-copy";
import type { CollectionOverride, CollectionOverrides } from "./objekt";

type Copy = { map: CollectionOverrides; startedAt: number };

let copy: Copy | undefined;
let inFlight: { startedAt: number; result: Promise<Copy> } | undefined;

async function readOverrides(): Promise<CollectionOverrides> {
  const rows = await db
    .select({
      slug: collectionOverride.slug,
      textColor: collectionOverride.textColor,
      backgroundColor: collectionOverride.backgroundColor,
    })
    .from(collectionOverride);
  return new Map(
    rows.map((row): [string, CollectionOverride] => [
      row.slug,
      {
        ...(row.textColor ? { textColor: row.textColor } : {}),
        ...(row.backgroundColor ? { backgroundColor: row.backgroundColor } : {}),
      },
    ]),
  );
}

function startRead() {
  // taken before the query, so a read racing a save's commit is older than that save's bump
  const startedAt = Date.now();
  const result = readOverrides().then((map) => {
    const next = { map, startedAt };
    if (!copy || copy.startedAt < startedAt) copy = next;
    return next;
  });
  const read = { startedAt, result };
  inFlight = read;
  void result
    .finally(() => {
      if (inFlight === read) inFlight = undefined;
    })
    .catch(() => undefined);
  return read;
}

/**
 * Every collection colour override, from one per-process copy kept a minute. `freshAfter`
 * (`collection:modified-at` in ms) asks for a copy read after that bump. Env-free, so the
 * worker can call it. A failed read serves the last good copy, or none, with `fresh: false`,
 * so a database blip costs colours rather than pages.
 */
export async function loadCollectionOverrides(
  options: { freshAfter?: number } = {},
): Promise<{ map: CollectionOverrides; fresh: boolean }> {
  const { freshAfter } = options;
  if (copy && copyServes(copy.startedAt, Date.now(), freshAfter)) {
    return { map: copy.map, fresh: true };
  }
  const read =
    inFlight && (freshAfter === undefined || inFlight.startedAt > freshAfter)
      ? inFlight
      : startRead();
  try {
    const { map } = await read.result;
    return { map, fresh: true };
  } catch (error) {
    console.error("Collection overrides read failed:", error);
    return { map: copy?.map ?? new Map(), fresh: false };
  }
}
