import { endOfDay } from "date-fns";
import { useMemo } from "react";
import { create } from "zustand";

import type { Profile } from "@/components/profile/profile-data";

/**
 * "View this collection as of <date>". The website carries it in the URL
 * (`?at=YYYY-MM-DD`), which makes it a property of the profile page rather
 * than of the one popover that sets it — the Collection tab has to know
 * whether a snapshot is on, because a past ownership state is not something
 * you can pin, lock or reorder. The lab has no search params on this route, so
 * one store stands in for the param, and all four tabs that render
 * `SnapshotPopover` now agree on the date instead of each holding their own.
 *
 * The date is stored next to the nickname it was picked on. A past state of
 * one Cosmo means nothing on another, and a bare `date` would stay in force
 * for the first paint after the route param changes — long enough to show the
 * new profile's collection cut at the old profile's date. `useSnapshotDate`
 * answers `null` for any other nickname, so that frame cannot happen; the
 * route's own `clear` on `$nickname` then drops the date for good, the way
 * navigating to a URL without `?at=` does in the website.
 */
type SnapshotState = {
  /** the profile the date belongs to; `null` when nothing is set */
  nickname: string | null;
  /** null is "live"; any date puts that profile in snapshot mode */
  date: Date | null;
  setDate: (nickname: string, date: Date | null) => void;
  clear: () => void;
};

export const useSnapshot = create<SnapshotState>((set) => ({
  nickname: null,
  date: null,
  setDate: (nickname, date) => set({ nickname, date }),
  clear: () => set({ nickname: null, date: null }),
}));

/** the snapshot date in force on this profile, or `null` when it is live */
export function useSnapshotDate(nickname: string): Date | null {
  return useSnapshot((s) => (s.nickname === nickname ? s.date : null));
}

/**
 * The profile as it stood at the end of the snapshot day — the one chokepoint
 * the four tabs share, so Collection, Activity, Statistics and Progress cannot
 * disagree about what was held.
 *
 * Only the owned side moves: `objekts` loses everything received after the
 * cut-off, and the pins and locks narrow with it (a pin on something not held
 * yet is not on the shelf). Denominators are untouched — Progress still
 * measures against the whole catalogue, because the catalogue did not shrink.
 */
export function useSnapshotProfile(profile: Profile): { profile: Profile; date: Date | null } {
  const date = useSnapshotDate(profile.nickname);

  return useMemo(() => {
    if (date === null) return { profile, date };
    const cutoff = endOfDay(date).getTime();
    // a fixture with no `receivedAt` cannot be placed in time, so it is not
    // claimed to have been held: the snapshot only shows what it can date
    const objekts = profile.objekts.filter(
      (o) => o.receivedAt !== undefined && o.receivedAt.getTime() <= cutoff,
    );
    const ids = new Set(objekts.map((o) => o.id));
    return {
      profile: {
        ...profile,
        objekts,
        pinnedIds: profile.pinnedIds.filter((id) => ids.has(id)),
        lockedIds: profile.lockedIds.filter((id) => ids.has(id)),
      },
      date,
    };
  }, [profile, date]);
}
