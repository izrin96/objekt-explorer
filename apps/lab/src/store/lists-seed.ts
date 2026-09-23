import { objekts } from "@/fixtures/objekts";
import { hash, rng } from "@/lib/seeded";
import type { LabList, ListEntry, ListType } from "@/store/lists";

/**
 * The six lists the lab starts with, and the entries behind them.
 *
 * `entries` is derived from the list id rather than written out, so
 * `/list/<slug>` shows the same grid across reloads — the same contract the
 * market and serial fixtures follow. `updatedAt` is placed relative to load
 * rather than pinned to a date, so a row always reads the same distance
 * whichever day the lab is opened.
 */

/**
 * Fill a seeded list with 4–30 distinct collections drawn from the objekt
 * fixtures. Keyed on the list id, so `/list/<slug>` shows the same grid across
 * reloads — the same contract the market and serial fixtures follow.
 */
function seedEntries(id: string, type: ListType): ListEntry[] {
  const next = rng(hash(`list:${id}`));
  const count = 4 + Math.floor(next() * 27);
  const taken = new Set<string>();
  const rows: ListEntry[] = [];

  for (let i = 0; rows.length < count && i < count * 20; i++) {
    const objekt = objekts[Math.floor(next() * objekts.length)];
    if (!objekt || taken.has(objekt.id)) continue;
    taken.add(objekt.id);
    // roughly a quarter of a sale list is still waiting for a price
    const priced = type === "sale" && next() > 0.25;
    rows.push(
      priced
        ? { objektId: objekt.id, price: Math.round((3 + next() * 42) * 100) / 100 }
        : { objektId: objekt.id },
    );
  }

  return rows;
}

/** everything a seeded list declares; `entries` is derived from the id */
type ListSeed = Omit<LabList, "entries">;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** a moment relative to load, so a row reads the same distance on any day */
const ago = (ms: number) => new Date(Date.now() - ms);

function seeded(seed: ListSeed): LabList {
  return {
    id: seed.id,
    name: seed.name,
    type: seed.type,
    currency: seed.currency,
    description: seed.description,
    linkedListId: seed.linkedListId,
    profileNickname: seed.profileNickname,
    isProfileBind: seed.isProfileBind,
    isPublic: seed.isPublic,
    entries: seedEntries(seed.id, seed.type),
    updatedAt: seed.updatedAt,
    start: seed.start,
  };
}

export const SEED: LabList[] = (
  [
    {
      id: "selling-for-real",
      name: "selling for real",
      type: "sale",
      currency: "MYR",
      description: "tng / malaysia bank / wise",
      linkedListId: null,
      profileNickname: "izrin96",
      isProfileBind: true,
      isPublic: true,
      updatedAt: ago(2 * DAY),
      start: 0,
    },
    {
      id: "want-3",
      name: "want 3",
      type: "want",
      currency: "",
      description: "",
      linkedListId: "have-3",
      profileNickname: null,
      isProfileBind: false,
      isPublic: true,
      updatedAt: ago(7 * DAY),
      start: 3,
    },
    {
      id: "have-3",
      name: "have 3",
      type: "have",
      currency: "",
      description: "dupes only",
      linkedListId: "want-3",
      // filed under the Cosmo but kept off its Lists tab — the case the lab
      // could not express while the two fields were one
      profileNickname: "izrin96",
      isProfileBind: false,
      isPublic: true,
      updatedAt: ago(3 * DAY + 4 * HOUR),
      start: 6,
    },
    {
      id: "sale1",
      name: "sale1",
      type: "sale",
      currency: "USD",
      description: "",
      linkedListId: null,
      profileNickname: null,
      isProfileBind: false,
      isPublic: false,
      updatedAt: ago(14 * DAY),
      start: 9,
    },
    {
      id: "want-test-2",
      name: "want test 2",
      type: "want",
      currency: "",
      description: "",
      linkedListId: null,
      profileNickname: null,
      isProfileBind: false,
      isPublic: false,
      updatedAt: ago(23 * DAY),
      start: 12,
    },
    {
      id: "general",
      name: "general",
      type: "general",
      currency: "",
      description: "everything else",
      linkedListId: null,
      profileNickname: null,
      isProfileBind: false,
      isPublic: true,
      updatedAt: ago(47 * DAY),
      start: 15,
    },
  ] satisfies ListSeed[]
).map(seeded);
