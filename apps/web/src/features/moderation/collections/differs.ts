import { groupKey, type ColourKind } from "@repo/lib/collection-colours";

type OverrideRow = {
  slug: string;
  artist: string;
  season: string;
  collectionNo: string;
  textColor: string | null;
  backgroundColor: string | null;
  textPinned: boolean;
  backgroundPinned: boolean;
  cosmo: { textColor: string | null; backgroundColor: string | null };
  differs: { text: boolean; background: boolean };
};

/** One Differs from Cosmo entry: members of one number sharing the staff and Cosmo colour. */
export type DiffersGroup<Row extends OverrideRow> = {
  key: string;
  kind: ColourKind;
  staff: string;
  cosmo: string;
  members: Row[];
};

/** The overrides as the admin saw them, which a group action sends so a changed row is skipped. */
export function expectedOf(row: OverrideRow) {
  return {
    textColor: row.textColor,
    backgroundColor: row.backgroundColor,
    textPinned: row.textPinned,
    backgroundPinned: row.backgroundPinned,
  };
}

/** How many collections have a colour on Differs from Cosmo. */
export function differsCount(rows: OverrideRow[]) {
  return rows.filter((row) => row.differs.text || row.differs.background).length;
}

/** Differs from Cosmo's groups, in collection number order, each listing its members by slug. */
export function differsGroups<Row extends OverrideRow>(rows: Row[]): DiffersGroup<Row>[] {
  const groups = new Map<string, DiffersGroup<Row>>();
  for (const row of rows) {
    for (const kind of ["text", "background"] as const) {
      const staff = kind === "text" ? row.textColor : row.backgroundColor;
      const cosmo = kind === "text" ? row.cosmo.textColor : row.cosmo.backgroundColor;
      if (!row.differs[kind] || staff === null || cosmo === null) continue;
      const key = groupKey(row, kind, staff, cosmo);
      const group = groups.get(key) ?? {
        key,
        kind,
        staff: staff.toLowerCase(),
        cosmo,
        members: [],
      };
      group.members.push(row);
      groups.set(key, group);
    }
  }
  for (const group of groups.values()) group.members.sort((a, b) => a.slug.localeCompare(b.slug));
  return [...groups.values()].toSorted((a, b) => {
    const [x, y] = [a.members[0]!, b.members[0]!];
    return (
      x.artist.localeCompare(y.artist) ||
      x.season.localeCompare(y.season) ||
      x.collectionNo.localeCompare(y.collectionNo, undefined, { numeric: true }) ||
      a.kind.localeCompare(b.kind) ||
      a.key.localeCompare(b.key)
    );
  });
}
