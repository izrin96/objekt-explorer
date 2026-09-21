import { useMemo } from "react";
import { create } from "zustand";

import type { Profile } from "@/components/profile/profile-data";
import { readStringArray, writeStringArray } from "@/lib/local-storage";

/**
 * Locked objekts — the owner's "do not let me trade this away" flag, which is
 * why the website gates it on owning the Cosmo and hides it in snapshot mode.
 *
 * Same shape as `store/pins.ts`: a per-nickname persisted key
 * (`lab:locks:<nickname>`) seeded from the fixture's `lockedIds` on first
 * read, held in a module-level cache rather than in the store so the first
 * render of a profile already has the persisted set in hand. Hydrating from an
 * effect paints the fixture's locks and then corrects them; hydrating with
 * `setState` during render is a store write in the middle of a render pass.
 *
 * The one difference from pins: a lock has no order, so the stored array is a
 * set that happens to be written as a list, and nothing depends on where in it
 * an id sits.
 */

const storageKey = (nickname: string) => `lab:locks:${nickname}`;

/** nickname → the locks this session started from (persisted, else the fixture) */
const seeded = new Map<string, string[]>();

function baseLocks(nickname: string, seed: readonly string[]): string[] {
  let ids = seeded.get(nickname);
  if (ids === undefined) {
    ids = readStringArray(storageKey(nickname)) ?? [...seed];
    seeded.set(nickname, ids);
  }
  return ids;
}

type LockState = {
  /** only the profiles this session has changed; everything else reads its seed */
  locks: Record<string, string[]>;
  write: (nickname: string, ids: string[]) => void;
};

const useLockStore = create<LockState>((set) => ({
  locks: {},
  write: (nickname, ids) => {
    writeStringArray(storageKey(nickname), ids);
    set((s) => ({ locks: { ...s.locks, [nickname]: ids } }));
  },
}));

export type Locks = {
  /** locked ids the profile still holds, so the header stat cannot over-count */
  ids: string[];
  /** the same ids as a set, for the card's `lock` badge and `applyFilters` */
  idSet: ReadonlySet<string>;
  lock: (ids: Iterable<string>) => void;
  unlock: (ids: Iterable<string>) => void;
  toggle: (id: string) => void;
};

/**
 * The profile's locks, narrowed to what it still holds — `profile` is the
 * artist-scoped (and, under a snapshot, date-scoped) profile, so a lock on a
 * token outside the current view drops out of `ids` without being unlocked:
 * every write starts from the full stored set, not from the visible one.
 */
export function useLocks(profile: Profile): Locks {
  const nickname = profile.nickname;
  const seed = profile.lockedIds;
  const stored = useLockStore((s) => s.locks[nickname]);
  const all = stored ?? baseLocks(nickname, seed);

  const ids = useMemo(() => {
    const owned = new Set(profile.objekts.map((o) => o.id));
    return all.filter((id) => owned.has(id));
  }, [all, profile.objekts]);

  const idSet = useMemo(() => new Set(ids), [ids]);

  return useMemo(() => {
    const current = () => useLockStore.getState().locks[nickname] ?? baseLocks(nickname, seed);
    const write = (next: string[]) => useLockStore.getState().write(nickname, next);
    return {
      ids,
      idSet,
      lock: (add) => {
        const next = new Set(current());
        for (const id of add) next.add(id);
        write([...next]);
      },
      unlock: (remove) => {
        const drop = new Set(remove);
        write(current().filter((id) => !drop.has(id)));
      },
      toggle: (id) => {
        const next = current();
        write(next.includes(id) ? next.filter((x) => x !== id) : [...next, id]);
      },
    };
  }, [ids, idSet, nickname, seed]);
}
