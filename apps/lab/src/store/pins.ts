import { useMemo } from "react";
import { create } from "zustand";

import type { Profile } from "@/components/profile/profile-data";
import { readStringArray, writeStringArray } from "@/lib/local-storage";

/**
 * Pinned objekts, in the order the owner arranged them.
 *
 * Pins are a per-Cosmo list, so the persisted key is per nickname
 * (`lab:pins:<nickname>`) rather than one blob for the whole lab — a profile
 * nobody has touched has no key at all and keeps reading the fixture's own
 * `pinnedIds`.
 *
 * The seed is read once per nickname into a module-level cache rather than
 * into the store, so the first render of a profile already has the persisted
 * order in hand. Hydrating from an effect would paint the fixture order and
 * then reshuffle on reload; hydrating with `setState` during render is a store
 * write in the middle of a React render pass. A plain `Map` is neither.
 */

const storageKey = (nickname: string) => `lab:pins:${nickname}`;

/** nickname → the order this session started from (persisted, else the fixture) */
const seeded = new Map<string, string[]>();

function baseOrder(nickname: string, seed: readonly string[]): string[] {
  let order = seeded.get(nickname);
  if (order === undefined) {
    order = readStringArray(storageKey(nickname)) ?? [...seed];
    seeded.set(nickname, order);
  }
  return order;
}

type PinState = {
  /** only the profiles this session has changed; everything else reads its seed */
  orders: Record<string, string[]>;
  write: (nickname: string, order: string[]) => void;
};

const usePinStore = create<PinState>((set) => ({
  orders: {},
  write: (nickname, order) => {
    writeStringArray(storageKey(nickname), order);
    set((s) => ({ orders: { ...s.orders, [nickname]: order } }));
  },
}));

export type Pins = {
  /** pinned ids the profile still holds, in display order */
  ids: string[];
  /** the same ids as a set, for the grid's `pin` flag and `hidePins` */
  idSet: ReadonlySet<string>;
  /** commit a new order for the visible pins (the drag drop handler) */
  reorder: (ids: string[]) => void;
  pin: (id: string) => void;
  unpin: (id: string) => void;
};

/**
 * The profile's pins, narrowed to what it still holds. `profile` is the
 * artist-scoped profile, so a pin whose objekt is outside the current artist
 * scope drops out of `ids` — and `reorder` keeps it in the stored order
 * anyway, appended behind the visible ones, so narrowing the scope, dragging,
 * and widening it again does not lose a pin.
 */
export function usePins(profile: Profile): Pins {
  const nickname = profile.nickname;
  const seed = profile.pinnedIds;
  const stored = usePinStore((s) => s.orders[nickname]);
  const order = stored ?? baseOrder(nickname, seed);

  const ids = useMemo(() => {
    const owned = new Set(profile.objekts.map((o) => o.id));
    return order.filter((id) => owned.has(id));
  }, [order, profile.objekts]);

  const idSet = useMemo(() => new Set(ids), [ids]);

  return useMemo(() => {
    const current = () => usePinStore.getState().orders[nickname] ?? baseOrder(nickname, seed);
    const write = (next: string[]) => usePinStore.getState().write(nickname, next);
    return {
      ids,
      idSet,
      // the handler only knows the pins it can see; the rest keep their places
      // behind them rather than being dropped by a reorder under a narrow scope
      reorder: (visible) => write([...visible, ...current().filter((id) => !visible.includes(id))]),
      pin: (id) => {
        const order = current();
        if (!order.includes(id)) write([...order, id]);
      },
      unpin: (id) => {
        const order = current();
        if (order.includes(id)) write(order.filter((x) => x !== id));
      },
    };
  }, [ids, idSet, nickname, seed]);
}
