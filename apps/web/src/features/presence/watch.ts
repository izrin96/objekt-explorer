import { PRESENCE_BATCH_LIMIT } from "@repo/api/schemas/presence";

/** How often a visible tab checks every id on screen. */
export const PRESENCE_POLL_MS = 30_000;
/** How long newly watched ids wait, so a scroll asks once for every row it brought in. */
export const PRESENCE_DEBOUNCE_MS = 300;

/** Counts one more avatar showing `id`; true when it was not watched before. */
export function watch(watched: Map<string, number>, id: string) {
  const count = watched.get(id) ?? 0;
  watched.set(id, count + 1);
  return count === 0;
}

/** Counts one avatar fewer; true when nothing shows `id` any more. */
export function unwatch(watched: Map<string, number>, id: string) {
  const count = watched.get(id);
  if (count === undefined) return false;
  if (count > 1) {
    watched.set(id, count - 1);
    return false;
  }
  watched.delete(id);
  return true;
}

/** Watched ids never answered, or answered at least `interval` ago. */
export function dueIds(
  watched: ReadonlyMap<string, number>,
  lastChecked: ReadonlyMap<string, number>,
  now: number,
  interval = PRESENCE_POLL_MS,
) {
  return [...watched.keys()].filter((id) => {
    const at = lastChecked.get(id);
    return at === undefined || now - at >= interval;
  });
}

export function chunk<T>(items: T[], size = PRESENCE_BATCH_LIMIT) {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}

/**
 * The online map after an answer: each asked id is online exactly when the answer names it.
 * Returns the same object when nothing changed, so no selector re-renders.
 */
export function applyOnline(
  online: Readonly<Record<string, true>>,
  asked: string[],
  answer: string[],
): Record<string, true> {
  const now = new Set(answer);
  const next: Record<string, true> = { ...online };
  let changed = false;
  for (const id of asked) {
    if (now.has(id)) {
      if (next[id] !== true) {
        next[id] = true;
        changed = true;
      }
    } else if (id in next) {
      delete next[id];
      changed = true;
    }
  }
  return changed ? next : online;
}
