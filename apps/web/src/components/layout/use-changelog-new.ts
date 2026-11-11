import { useHydrated } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";
import { useChangelogStore } from "@/stores/changelog";

import { CHANGELOG } from "./changelog-entries";

const NEW_FOR_DAYS = 5;

const LATEST = CHANGELOG[0];
/** changes when the newest entry gains an item, not only when a new entry starts */
const LATEST_KEY = `${LATEST.date}:${LATEST.items.length}`;

/** local midnight once the entry's last day and `NEW_FOR_DAYS` more have passed */
function expiresAt(date: string): number {
  const [year = 0, month = 1, day = 1] = (date.split(" - ").at(-1) ?? date).split("-").map(Number);
  return new Date(year, month - 1, day + 1 + NEW_FOR_DAYS).getTime();
}

// once per page load, outside render
const LATEST_IS_RECENT = Date.now() < expiresAt(LATEST.date);

/** The server cannot know what this browser has seen, so nothing is new before hydration. */
export function useChangelogNew() {
  const hydrated = useHydrated();
  const seen = useChangelogStore((s) => s.seen);
  const markSeen = useChangelogStore((s) => s.markSeen);
  const isNew = hydrated && LATEST_IS_RECENT && seen !== LATEST_KEY;

  return {
    isNew,
    label: isNew ? m.common_changelog_new() : m.common_changelog(),
    markSeen: () => markSeen(LATEST_KEY),
  };
}
