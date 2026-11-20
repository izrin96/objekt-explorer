import { parseHexColor } from "@repo/api/schemas/admin";

type Listed = {
  slug: string;
  member: string;
  collectionNo: string;
  textColor: string;
  backgroundColor: string;
};

type Override = {
  textColor: string | null;
  backgroundColor: string | null;
  textPinned?: boolean;
  backgroundPinned?: boolean;
  /** null when the indexer no longer has the collection */
  source: { textColor: string; backgroundColor: string } | null;
  /** Cosmo's colours, null where unknown */
  cosmo?: { textColor: string | null; backgroundColor: string | null };
  /** read members of the same collection number whose agreed Cosmo text colour it shows */
  textMatchesSiblings?: { member: string }[] | null;
};

export type ColorState = {
  current: string;
  source: string;
  overridden: boolean;
  pinned: boolean;
  /** Cosmo's colour beside an override, when known and not the source's */
  cosmo: string | null;
  /** what Reset puts back: Cosmo's colour when known, else the source's */
  resetTo: string;
  /** whether Edit's Pin starts checked */
  pinByDefault: boolean;
  /** members of the same number Cosmo read as this override's colour, while it has no read of its own */
  siblings: string[] | null;
};
export type RowColors = { text: ColorState; background: ColorState };

/** Every word of the search is found in the member, the collection number or the slug. */
export function matchesSearch(collection: Listed, search: string) {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  const member = collection.member.toLowerCase();
  const number = collection.collectionNo.toLowerCase();
  const slug = collection.slug.toLowerCase();
  return words.every(
    (word) => member.includes(word) || number.includes(word) || slug.includes(word),
  );
}

function colorState(
  listed: string,
  override: string | null,
  source: string | undefined,
  pinned: boolean,
  cosmo: string | null,
  siblings: string[] | null = null,
): ColorState {
  const current = (override ?? listed).toLowerCase();
  if (override === null) {
    return {
      current,
      source: current,
      overridden: false,
      pinned: false,
      cosmo: null,
      resetTo: current,
      pinByDefault: cosmo !== null,
      siblings: null,
    };
  }
  const kept = (source ?? listed).toLowerCase();
  return {
    current,
    source: kept,
    overridden: true,
    pinned,
    cosmo: cosmo !== null && cosmo !== kept ? cosmo : null,
    resetTo: cosmo ?? kept,
    pinByDefault: pinned,
    siblings,
  };
}

/**
 * A row's two colours. The list already carries any override, so with no override row its
 * colours are the source's; with one, the source and Cosmo's colours come from the override row.
 * A row with no override has no Cosmo text colour here, while its background is the source's.
 */
export function rowColors(collection: Listed, override: Override | undefined): RowColors {
  return {
    text: colorState(
      collection.textColor,
      override?.textColor ?? null,
      override?.source?.textColor,
      override?.textPinned ?? false,
      override?.cosmo?.textColor ?? null,
      override?.textMatchesSiblings?.map((sibling) => sibling.member) ?? null,
    ),
    background: colorState(
      collection.backgroundColor,
      override?.backgroundColor ?? null,
      override?.source?.backgroundColor,
      override?.backgroundPinned ?? false,
      override
        ? (override.cosmo?.backgroundColor ?? null)
        : collection.backgroundColor.toLowerCase(),
    ),
  };
}

/**
 * What Save sends for a row's fields: a colour left as it was is not sent, one typed as the colour
 * Reset puts back (Cosmo's, else the source's) resets its override, and any other is the new override. A pin is sent with a new
 * override, or alone when it changed on an override that stays. Null while a field is not a colour.
 */
export function colorChange(
  colors: RowColors,
  fields: { text: string; background: string; textPinned: boolean; backgroundPinned: boolean },
) {
  const text = parseHexColor(fields.text);
  const background = parseHexColor(fields.background);
  if (text === null || background === null) return null;
  const change = (state: ColorState, value: string) => {
    if (value === state.current) return undefined;
    // only the colour Reset would put back resets: with Cosmo's colour known, the source is not it
    if (state.overridden && value === state.resetTo) return null;
    return value;
  };
  const pin = (state: ColorState, colour: string | null | undefined, pinned: boolean) => {
    if (typeof colour === "string") return pinned;
    if (colour === undefined && state.overridden && pinned !== state.pinned) return pinned;
    return undefined;
  };
  const textColor = change(colors.text, text);
  const backgroundColor = change(colors.background, background);
  const textPinned = pin(colors.text, textColor, fields.textPinned);
  const backgroundPinned = pin(colors.background, backgroundColor, fields.backgroundPinned);
  return {
    ...(textColor !== undefined ? { textColor } : {}),
    ...(backgroundColor !== undefined ? { backgroundColor } : {}),
    ...(textPinned !== undefined ? { textPinned } : {}),
    ...(backgroundPinned !== undefined ? { backgroundPinned } : {}),
  };
}

/**
 * Whether an override is only a text colour its read siblings prove: Overrides only can hide it.
 * A background override keeps the row, since that colour has no such proof.
 */
export function provenBySiblings(
  override: Pick<Override, "backgroundColor" | "textMatchesSiblings">,
) {
  return override.backgroundColor === null && (override.textMatchesSiblings?.length ?? 0) > 0;
}
