/**
 * A collection's colour columns: a non-null source means staff override that colour, and a true
 * pin keeps that override over Cosmo's colour (null and false both mean a fill).
 */
export type ColourRow = {
  textColor: string;
  backgroundColor: string;
  sourceTextColor: string | null;
  sourceBackgroundColor: string | null;
  textColorPinned: boolean | null;
  backgroundColorPinned: boolean | null;
};

/** The columns a write changes; any left out stay as they are. */
export type ColourSet = Partial<ColourRow>;

/**
 * Each staff override, null where the source's colour applies, and whether it is pinned: the audit
 * entry's shape. Entries written before pins existed carry no pins and read as unpinned.
 */
export type OverrideColours = {
  textColor: string | null;
  backgroundColor: string | null;
  textPinned: boolean;
  backgroundPinned: boolean;
};

/**
 * A value sets the override, null resets it, absent leaves it. A pin applies to the colour's
 * override after the write and is dropped where none is left.
 */
export type ColourInput = {
  textColor?: string | null;
  backgroundColor?: string | null;
  textPinned?: boolean;
  backgroundPinned?: boolean;
};

export type ColourKind = "text" | "background";

const FIELDS = [
  {
    kind: "text",
    colour: "textColor",
    source: "sourceTextColor",
    pin: "textColorPinned",
    input: "textPinned",
  },
  {
    kind: "background",
    colour: "backgroundColor",
    source: "sourceBackgroundColor",
    pin: "backgroundColorPinned",
    input: "backgroundPinned",
  },
] as const;

/** What `collection_staff_colors` accepts for a staff colour. */
export function isStaffColour(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/.test(value);
}

/** A colour as `#rrggbb` lowercase, trimmed; null when it is not six hex digits after `#`. */
export function normaliseColour(value: string | null | undefined): string | null {
  const colour = value?.trim().toLowerCase();
  return colour && isStaffColour(colour) ? colour : null;
}

export function overridesOf(row: ColourRow): OverrideColours {
  return {
    textColor: row.sourceTextColor === null ? null : row.textColor,
    backgroundColor: row.sourceBackgroundColor === null ? null : row.backgroundColor,
    textPinned: row.sourceTextColor !== null && row.textColorPinned === true,
    backgroundPinned: row.sourceBackgroundColor !== null && row.backgroundColorPinned === true,
  };
}

/**
 * Cosmo's colours for a row: the text colour recorded from connected accounts' reads (unknown
 * while none is), and the source's background, which comes from Cosmo's metadata.
 */
export function cosmoColours(row: ColourRow, recordedText: string | null | undefined) {
  return {
    textColor: normaliseColour(recordedText),
    backgroundColor: normaliseColour(row.sourceBackgroundColor ?? row.backgroundColor),
  };
}

type Target = { textColor?: string | null; backgroundColor?: string | null };

function setOf(row: ColourRow, target: Target, resetTo: Target = {}): ColourSet {
  const set: ColourSet = {};
  for (const { colour, source, pin } of FIELDS) {
    const value = target[colour];
    if (value === undefined) continue;
    if (value === null) {
      const kept = row[source];
      if (kept === null) continue;
      const to = resetTo[colour] ?? kept;
      if (row[colour] !== to) set[colour] = to;
      set[source] = null;
      if (row[pin] !== null) set[pin] = null;
    } else {
      if (row[colour] !== value) set[colour] = value;
      if (row[source] === null) set[source] = row[colour];
    }
  }
  return set;
}

/**
 * A planned write: the columns, the overrides before and after for the audit, and the colours the
 * collection shows after it, since a cleared override shows Cosmo's colour or the source's.
 */
function plan(row: ColourRow, set: ColourSet) {
  const merged = { ...row, ...set };
  return {
    set,
    before: overridesOf(row),
    after: overridesOf(merged),
    shown: { textColor: merged.textColor, backgroundColor: merged.backgroundColor },
  };
}

/**
 * A staff save, pin or reset: the columns to write, and the overrides before and after for the
 * audit. The first change of a colour keeps the value it replaced as its source, exactly as given.
 * A text reset goes to Cosmo's recorded text colour when there is one; a background reset goes to
 * the kept source, which is Cosmo's background.
 */
export function planColourWrite(row: ColourRow, input: ColourInput, recordedText?: string | null) {
  const set = setOf(row, input, { textColor: normaliseColour(recordedText) });
  const merged = { ...row, ...set };
  for (const { source, pin, input: key } of FIELDS) {
    const wanted = input[key];
    if (merged[source] === null) {
      if (merged[pin] !== null) set[pin] = null;
    } else if (wanted !== undefined && (merged[pin] === true) !== wanted) {
      set[pin] = wanted;
    }
  }
  return plan(row, set);
}

/**
 * Cosmo resolving a row's fills: each unpinned override equal to Cosmo's colour, ignoring case and
 * surrounding spaces, is dropped and shows Cosmo's colour normalised. Null when nothing changes.
 */
export function planCosmoResolve(row: ColourRow, recordedText: string | null | undefined) {
  const cosmo = cosmoColours(row, recordedText);
  const set: ColourSet = {};
  for (const { colour, source, pin } of FIELDS) {
    if (row[source] === null || row[pin] === true) continue;
    const to = cosmo[colour];
    if (to === null || normaliseColour(row[colour]) !== to) continue;
    if (row[colour] !== to) set[colour] = to;
    set[source] = null;
    if (row[pin] !== null) set[pin] = null;
  }
  return Object.keys(set).length === 0 ? null : plan(row, set);
}

/** Which unpinned overrides differ from a known Cosmo colour: what Differs from Cosmo lists. */
export function differsFromCosmo(row: ColourRow, recordedText: string | null | undefined) {
  const cosmo = cosmoColours(row, recordedText);
  const differs = (
    colour: "textColor" | "backgroundColor",
    source: keyof ColourRow,
    pin: keyof ColourRow,
  ) =>
    row[source] !== null &&
    row[pin] !== true &&
    cosmo[colour] !== null &&
    normaliseColour(row[colour]) !== cosmo[colour];
  return {
    text: differs("textColor", "sourceTextColor", "textColorPinned"),
    background: differs("backgroundColor", "sourceBackgroundColor", "backgroundColorPinned"),
  };
}

/** Collections of one collection number: the same artist, season and number. */
export type CollectionNumber = { artist: string; season: string; collectionNo: string };

export function numberKey(row: CollectionNumber) {
  return `${row.artist}\u0000${row.season}\u0000${row.collectionNo.toLowerCase()}`;
}

/**
 * The Differs from Cosmo group of one colour: one collection number, the same staff colour and the
 * same Cosmo colour, so one decision fits every member.
 */
export function groupKey(row: CollectionNumber, kind: ColourKind, staff: string, cosmo: string) {
  return `${numberKey(row)}\u0000${kind}\u0000${normaliseColour(staff) ?? staff}\u0000${normaliseColour(cosmo) ?? cosmo}`;
}

export type SiblingMember = {
  slug: string;
  /** the text colour the collection shows */
  textColor: string;
  /** whether staff override its text colour */
  overridden: boolean;
  /** Cosmo's recorded text colour, null while none is */
  recordedText: string | null;
};

/**
 * A suggestion for one collection number's unread members (no recorded text colour, no staff text
 * colour): the colour every read member agrees on, the read members, and the unread members that
 * show another colour. Null when none is read, the read members disagree, or no member would change.
 */
export function suggestSiblings(members: SiblingMember[]) {
  const read = members.flatMap((member) => {
    const colour = normaliseColour(member.recordedText);
    return colour === null ? [] : [{ slug: member.slug, colour }];
  });
  const [first] = read;
  if (!first || read.some((member) => member.colour !== first.colour)) return null;
  const { colour } = first;
  const unread = members.filter(
    (member) =>
      normaliseColour(member.recordedText) === null &&
      !member.overridden &&
      normaliseColour(member.textColor) !== colour,
  );
  if (unread.length === 0) return null;
  return {
    colour,
    read: read.map((member) => member.slug),
    unread: unread.map((member) => member.slug),
  };
}

/** The columns that bring a row to an audit entry's `after`, or null when it already matches. */
export function planReplay(
  row: ColourRow,
  after: Pick<OverrideColours, "textColor" | "backgroundColor">,
): ColourSet | null {
  const set = setOf(row, after);
  return Object.keys(set).length === 0 ? null : set;
}
