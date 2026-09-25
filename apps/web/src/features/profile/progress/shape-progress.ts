import type { ValidObjekt } from "@repo/lib/types/objekt";

import { isMeasuredClass, tradeableFilter } from "@/lib/unobtainables";

/** owned / total for one node of the breakdown */
export type Tally = { owned: number; total: number; pct: number };

export type MemberProgress = Tally & { member: string; color: string };

type ProgressItem = { objekt: ValidObjekt; owned: boolean; unobtainable: boolean };

export type ClassGroup = Tally & { class: string; items: ProgressItem[] };

/** `Choerry Atom02`, with its class groups */
export type MemberSeason = {
  key: string;
  member: string;
  season: string;
  color: string;
  classes: ClassGroup[];
};

function pct(owned: number, total: number): number {
  return total > 0 ? (owned / total) * 100 : 0;
}

type Comparators = {
  compareMember: (a: string, b: string) => number;
  compareSeason: (a: string, b: string) => number;
  compareClass: (a: string, b: string) => number;
  memberColor: (name: string) => string;
};

/** one bar of the chart, named and coloured by the artist payload */
export type ChartMember = { name: string; color: string };

/** Members who have left their group. */
const formerMembers = new Set(["MinGyeol"]);

/** Former members are left out of the chart and its panels unless the Member filter picks them. */
export function rankableMembers(members: readonly ChartMember[], picked: readonly string[] = []) {
  const names = new Set(picked.map((name) => name.toLowerCase()));
  return members.filter(
    (member) => !formerMembers.has(member.name) || names.has(member.name.toLowerCase()),
  );
}

/**
 * One row per member of the selected artists, in the payload's own order.
 *
 * A unit objekt lists every member it carries and counts towards each of them;
 * the catalogue's `member` column is not a member name for a unit (`S7 X S15`)
 * or an event (`sun`), so it cannot be what the bars are grouped by.
 */
export function memberProgress(
  catalogue: readonly ValidObjekt[],
  ownedSlugs: ReadonlySet<string>,
  members: readonly ChartMember[],
): MemberProgress[] {
  const tallies = new Map<string, { owned: number; total: number }>();

  for (const objekt of catalogue) {
    if (!tradeableFilter(objekt)) continue;
    const owned = ownedSlugs.has(objekt.slug);

    for (const name of objekt.members) {
      let tally = tallies.get(name);
      if (!tally) {
        tally = { owned: 0, total: 0 };
        tallies.set(name, tally);
      }
      tally.total += 1;
      if (owned) tally.owned += 1;
    }
  }

  return members.map(({ name, color }) => {
    const tally = tallies.get(name);
    const owned = tally?.owned ?? 0;
    const total = tally?.total ?? 0;

    return { member: name, color, owned, total, pct: pct(owned, total) };
  });
}

/** The overall bar: one collection counted once, however many members it lists. */
export function catalogueTotals(
  catalogue: readonly ValidObjekt[],
  ownedSlugs: ReadonlySet<string>,
): Tally {
  let owned = 0;
  let total = 0;

  for (const objekt of catalogue) {
    if (!tradeableFilter(objekt)) continue;
    total += 1;
    if (ownedSlugs.has(objekt.slug)) owned += 1;
  }

  return { owned, total, pct: pct(owned, total) };
}

/**
 * The catalogue bucketed into `Member Season` sections, each holding its class
 * groups, with Welcome and Zero dropped.
 *
 * A unit objekt lists several members, so while the Member facet is set it is
 * counted once under every selected member it carries rather than only under
 * its primary one.
 */
export function shapeProgress(
  catalogue: readonly ValidObjekt[],
  ownedSlugs: ReadonlySet<string>,
  selectedMembers: readonly string[] | undefined,
  { compareMember, compareSeason, compareClass, memberColor }: Comparators,
): MemberSeason[] {
  const sections = new Map<string, Map<string, ValidObjekt[]>>();

  for (const objekt of catalogue) {
    if (!isMeasuredClass(objekt)) continue;

    const matched = selectedMembers?.length
      ? objekt.members.filter((member) => selectedMembers.includes(member))
      : [];
    const members = matched.length > 0 ? matched : [objekt.member];

    for (const member of members) {
      const key = `${member} ${objekt.season}`;
      let classes = sections.get(key);
      if (!classes) {
        classes = new Map();
        sections.set(key, classes);
      }
      const items = classes.get(objekt.class);
      if (items) items.push(objekt);
      else classes.set(objekt.class, [objekt]);
    }
  }

  const rows = [...sections.entries()].map(([key, classMap]): MemberSeason => {
    const first = [...classMap.values()][0]?.[0];
    const classes = [...classMap.entries()]
      .map(([name, objekts]): ClassGroup => {
        // duplicates of one collection are one row of the breakdown
        const byCollection = new Map<string, ValidObjekt>();
        for (const objekt of objekts) {
          if (!byCollection.has(objekt.collectionId)) byCollection.set(objekt.collectionId, objekt);
        }
        const items = [...byCollection.values()]
          .toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo))
          .map((objekt) => ({
            objekt,
            owned: ownedSlugs.has(objekt.slug),
            unobtainable: !tradeableFilter(objekt),
          }));
        // an unobtainable is still shown, but it can never be completed
        const counted = items.filter((item) => !item.unobtainable);
        const owned = counted.filter((item) => item.owned).length;

        return {
          class: name,
          items,
          owned,
          total: counted.length,
          pct: pct(owned, counted.length),
        };
      })
      .sort((a, b) => compareClass(a.class, b.class));

    // every item in a section shares its season, and the member is the key's
    // head — which is not `first.member` for a unit objekt
    const member = key.slice(0, key.length - (first?.season.length ?? 0) - 1);

    return {
      key,
      member,
      season: first?.season ?? "",
      color: memberColor(member),
      classes,
    };
  });

  return rows.sort(
    (a, b) => compareMember(a.member, b.member) || compareSeason(b.season, a.season),
  );
}
