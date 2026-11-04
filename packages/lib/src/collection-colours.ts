/** A collection's colour columns: a non-null source means staff override that colour. */
export type ColourRow = {
  textColor: string;
  backgroundColor: string;
  sourceTextColor: string | null;
  sourceBackgroundColor: string | null;
};

/** The columns a write changes; any left out stay as they are. */
export type ColourSet = Partial<ColourRow>;

/** Each staff override, null where the source's colour applies: the audit entry's shape. */
export type OverrideColours = { textColor: string | null; backgroundColor: string | null };

/** A value sets the override, null resets it to the source, absent leaves it. */
export type ColourInput = { textColor?: string | null; backgroundColor?: string | null };

const FIELDS = [
  ["textColor", "sourceTextColor"],
  ["backgroundColor", "sourceBackgroundColor"],
] as const;

/** What `collection_staff_colors` accepts for a staff colour. */
export function isStaffColour(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/.test(value);
}

export function overridesOf(row: ColourRow): OverrideColours {
  return {
    textColor: row.sourceTextColor === null ? null : row.textColor,
    backgroundColor: row.sourceBackgroundColor === null ? null : row.backgroundColor,
  };
}

function setOf(row: ColourRow, target: Partial<OverrideColours>): ColourSet {
  const set: ColourSet = {};
  for (const [colour, source] of FIELDS) {
    const value = target[colour];
    if (value === undefined) continue;
    if (value === null) {
      const kept = row[source];
      if (kept === null) continue;
      set[colour] = kept;
      set[source] = null;
    } else {
      if (row[colour] !== value) set[colour] = value;
      if (row[source] === null) set[source] = row[colour];
    }
  }
  return set;
}

/**
 * A staff save or reset: the columns to write, and the overrides before and after for the audit.
 * The first change of a colour keeps the value it replaced as its source, exactly as given.
 */
export function planColourWrite(row: ColourRow, input: ColourInput) {
  const set = setOf(row, input);
  return { set, before: overridesOf(row), after: overridesOf({ ...row, ...set }) };
}

/** The columns that bring a row to an audit entry's `after`, or null when it already matches. */
export function planReplay(row: ColourRow, after: OverrideColours): ColourSet | null {
  const set = setOf(row, after);
  return Object.keys(set).length === 0 ? null : set;
}
