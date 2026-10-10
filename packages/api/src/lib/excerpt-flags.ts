import { FLAG_CATEGORIES, type FlagCategory } from "../schemas/chat";
import type { ExcerptEntry } from "../schemas/moderation";
import { scanMessage } from "./scam-patterns";

/** Only the reported account's lines are scanned: a reporter quoting a scam phrase is not the scam. */
export function flagExcerpt(
  entries: ExcerptEntry[],
): (ExcerptEntry & { flagged: FlagCategory[] })[] {
  return entries.map((entry) => {
    if (!entry.fromTarget) return { ...entry, flagged: [] };
    const found = new Set([
      ...scanMessage(entry.body ?? ""),
      ...scanMessage(entry.offer?.note ?? ""),
    ]);
    return { ...entry, flagged: FLAG_CATEGORIES.filter((category) => found.has(category)) };
  });
}
