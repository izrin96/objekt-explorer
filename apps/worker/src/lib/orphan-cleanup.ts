import { HOUR_MS } from "@repo/api/lib/time";

import { MEDIA_PREFIX } from "./media-copy";

const MIN_AGE_MS = 2 * HOUR_MS;

type Listed = { key: string; lastModified: number };

/**
 * Which listed objects to delete. Objects modified in the last 2 hours are skipped: an upload may
 * not be recorded yet. When the media prefix holds objects but no `collection_media` row names a
 * copy, the script is reading the wrong app database, and every copy would look orphaned, so the
 * plan refuses.
 */
export function planOrphans(p: {
  objects: readonly Listed[];
  activeKeys: ReadonlySet<string>;
  rowCopyKeys: ReadonlySet<string>;
  now: number;
}) {
  const hasMedia = p.objects.some((o) => o.key.startsWith(MEDIA_PREFIX));
  if (hasMedia && p.rowCopyKeys.size === 0) return { ok: false as const };

  let tooNew = 0;
  const orphans: string[] = [];
  for (const o of p.objects) {
    if (p.activeKeys.has(o.key)) continue;
    if (!(p.now - o.lastModified >= MIN_AGE_MS)) {
      tooNew += 1;
      continue;
    }
    orphans.push(o.key);
  }
  return { ok: true as const, orphans, tooNew };
}
