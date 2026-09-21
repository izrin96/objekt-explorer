import type { ValidObjekt } from "@repo/lib/types/objekt";

/** owned / total for one node of the breakdown */
export type Tally = { owned: number; total: number; pct: number };

export type MemberProgress = Tally & { member: string; color: string };

type ProgressItem = { objekt: ValidObjekt; owned: boolean };

export type ClassGroup = Tally & { class: string; items: ProgressItem[] };

/** `Choerry Atom02`, with its class groups */
export type MemberSeason = {
  key: string;
  member: string;
  season: string;
  color: string;
  classes: ClassGroup[];
};

/** the classes the progress breakdown does not measure against */
const EXCLUDED_CLASSES = new Set(["Welcome", "Zero"]);

function pct(owned: number, total: number): number {
  return total > 0 ? (owned / total) * 100 : 0;
}

type Comparators = {
  compareMember: (a: string, b: string) => number;
  compareSeason: (a: string, b: string) => number;
  compareClass: (a: string, b: string) => number;
  memberColor: (name: string) => string;
};

export function memberProgress(
  catalogue: readonly ValidObjekt[],
  ownedSlugs: ReadonlySet<string>,
  { compareMember, memberColor }: Pick<Comparators, "compareMember" | "memberColor">,
): MemberProgress[] {
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

  return [...tallies.entries()]
    .map(([member, tally]) => ({
      member,
      color: memberColor(member),
      owned: tally.owned,
      total: tally.total,
      pct: pct(tally.owned, tally.total),
    }))
    .sort((a, b) => compareMember(a.member, b.member));
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
    if (EXCLUDED_CLASSES.has(objekt.class)) continue;

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
          .map((objekt) => ({ objekt, owned: ownedSlugs.has(objekt.slug) }));
        const owned = items.filter((item) => item.owned).length;

        return { class: name, items, owned, total: items.length, pct: pct(owned, items.length) };
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
