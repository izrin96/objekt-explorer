import { memberColor } from "@/components/filters/member-colors";
import { type LabArtist, type LabObjekt, objekts } from "@/fixtures/objekts";
import { ARTISTS } from "@/store/artists";

/**
 * The completion maths behind the Progress and Statistics tabs: how much of
 * the collection catalogue a profile holds, per member and per
 * `Member Season` section.
 *
 * Every function takes the catalogue already narrowed by `matchesFacets`, so
 * the chart, the summary panels and the sections all move together when a
 * toolbar facet changes.
 */

/** owned / total for one node of the progress breakdown */
export type Tally = {
  owned: number;
  total: number;
  /** 0–100 */
  pct: number;
};

/** one member's completion; the chart's datum and the summary panels' row */
export type MemberProgress = Tally & { member: string; color: string };

/** a catalogue row plus whether this profile holds it */
export type ProgressItem = { objekt: LabObjekt; owned: boolean };

/** one class inside one member+season, and the cards behind it */
export type ClassGroup = Tally & { class: string; items: ProgressItem[] };

/** `Choerry Atom02` — the website's `memberSeasonKey`, with its class groups */
export type MemberSeason = {
  key: string;
  member: string;
  season: string;
  color: string;
  classes: ClassGroup[];
};

/**
 * Cosmo's own reading order for the classes the catalogue carries; anything
 * new lands after it, alphabetically, rather than silently ahead of `First`.
 * `apps/website` gets the same order from the filter-data API (`classesMap`
 * feeding `compareClass`); the lab has no token for it, so it is pinned.
 */
const CLASS_ORDER = [
  "First",
  "Special",
  "Double",
  "Premier",
  "Welcome",
  "Zero",
  "Basic",
  "Motion",
  "Unit",
  "Event",
];

function classRank(name: string): number {
  const i = CLASS_ORDER.indexOf(name);
  return i === -1 ? CLASS_ORDER.length : i;
}

/** the website drops these two from the progress breakdown; the chart keeps them */
const EXCLUDED_CLASSES = new Set(["Welcome", "Zero"]);

/**
 * Season recency, newest first, read off the catalogue rather than pinned:
 * a season's rank is the newest `createdAt` any of its collections carries.
 * `apps/website` gets the same order from the filter-data API (`seasonsMap`
 * feeding `compareSeason`), so this is the lab's stand-in for that list and
 * cannot go stale when `collections.json` is refreshed.
 */
const SEASON_RANK: ReadonlyMap<string, number> = (() => {
  const newest = new Map<string, string>();
  for (const objekt of objekts) {
    const seen = newest.get(objekt.season);
    if (seen === undefined || objekt.createdAt > seen) newest.set(objekt.season, objekt.createdAt);
  }
  const ordered = [...newest.entries()].sort((a, b) => b[1].localeCompare(a[1]));
  return new Map(ordered.map(([season], i) => [season, i]));
})();

export function seasonRank(season: string): number {
  return SEASON_RANK.get(season) ?? SEASON_RANK.size;
}

/**
 * Artist order first, then the order the catalogue introduces each member —
 * the lab's stand-in for `useCosmoArtist().compareMember`, which walks
 * `artistMembers` in the order the Cosmo API returns them.
 */
const MEMBER_RANK: ReadonlyMap<string, number> = (() => {
  const byArtist = new Map<LabArtist, string[]>();
  for (const objekt of objekts) {
    let list = byArtist.get(objekt.artist);
    if (!list) {
      list = [];
      byArtist.set(objekt.artist, list);
    }
    if (!list.includes(objekt.member)) list.push(objekt.member);
  }
  return new Map(ARTISTS.flatMap((a) => byArtist.get(a) ?? []).map((name, i) => [name, i]));
})();

function memberRank(name: string): number {
  return MEMBER_RANK.get(name) ?? MEMBER_RANK.size;
}

function pct(owned: number, total: number): number {
  return total > 0 ? (owned / total) * 100 : 0;
}

/**
 * Completion per member, measured against the collection catalogue rather
 * than a hardcoded total. Feeds the chart shown while no member is selected,
 * and the summary panels above it.
 *
 * `catalogue` is expected to be pre-narrowed by `matchesFacets`, so a toolbar
 * facet moves the bars and the panels together.
 */
export function memberProgress(
  catalogue: readonly LabObjekt[],
  owned: readonly LabObjekt[],
): MemberProgress[] {
  const ownedSlugs = new Set(owned.map((o) => o.slug));
  const tallies = new Map<string, { owned: number; total: number }>();

  for (const objekt of catalogue) {
    let tally = tallies.get(objekt.member);
    if (!tally) {
      tally = { owned: 0, total: 0 };
      tallies.set(objekt.member, tally);
    }
    tally.total += 1;
    if (ownedSlugs.has(objekt.slug)) tally.owned += 1;
  }

  const rows = [...tallies.entries()].map(([member, tally]): MemberProgress => ({
    member,
    color: memberColor(member),
    owned: tally.owned,
    total: tally.total,
    pct: pct(tally.owned, tally.total),
  }));

  // completion first, then the bigger set: with 53 members over 180
  // collections a lot of rows tie at 100%, and a 6/6 set says more than a 1/1
  return rows.sort(
    (a, b) => b.pct - a.pct || b.total - a.total || a.member.localeCompare(b.member),
  );
}

/**
 * The same shape `apps/website`'s `useShapeProgress` produces: the catalogue
 * bucketed into `Member Season` sections, each holding its class groups, with
 * the Welcome and Zero classes dropped. Members run in artist order, seasons
 * newest first, classes in `CLASS_ORDER` — and each group keeps the catalogue
 * rows themselves, so the expansion below a class card can render the owned
 * cards and the missing ones from one list.
 *
 * `catalogue` is expected to be pre-narrowed by `matchesFacets`, which is what
 * makes the toolbar's Season / Class / Collection facets move every number.
 */
export function shapeProgress(
  catalogue: readonly LabObjekt[],
  owned: readonly LabObjekt[],
): MemberSeason[] {
  const ownedSlugs = new Set(owned.map((o) => o.slug));
  const sections = new Map<string, Map<string, ProgressItem[]>>();

  for (const objekt of catalogue) {
    if (EXCLUDED_CLASSES.has(objekt.class)) continue;
    const key = `${objekt.member} ${objekt.season}`;
    let classes = sections.get(key);
    if (!classes) {
      classes = new Map();
      sections.set(key, classes);
    }
    let items = classes.get(objekt.class);
    if (!items) {
      items = [];
      classes.set(objekt.class, items);
    }
    items.push({ objekt, owned: ownedSlugs.has(objekt.slug) });
  }

  const rows = [...sections.entries()].map(([key, classMap]): MemberSeason => {
    // every item in a section shares its member and season, so the first one
    // names the section rather than the key being split back apart
    const first = [...classMap.values()][0]?.[0]?.objekt;
    const classes = [...classMap.entries()]
      .map(([name, items]): ClassGroup => {
        const sorted = items.toSorted((a, b) =>
          a.objekt.collectionNo.localeCompare(b.objekt.collectionNo),
        );
        const ownedCount = sorted.filter((i) => i.owned).length;
        return {
          class: name,
          items: sorted,
          owned: ownedCount,
          total: sorted.length,
          pct: pct(ownedCount, sorted.length),
        };
      })
      .sort((a, b) => classRank(a.class) - classRank(b.class) || a.class.localeCompare(b.class));

    return {
      key,
      member: first?.member ?? key,
      season: first?.season ?? "",
      color: memberColor(first?.member ?? ""),
      classes,
    };
  });

  return rows.sort(
    (a, b) =>
      memberRank(a.member) - memberRank(b.member) ||
      seasonRank(a.season) - seasonRank(b.season) ||
      a.key.localeCompare(b.key),
  );
}
