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
  /** null when the indexer no longer has the collection */
  source: { textColor: string; backgroundColor: string } | null;
};

export type ColorState = { current: string; source: string; overridden: boolean };
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

function colorState(listed: string, override: string | null, source: string | undefined) {
  const current = (override ?? listed).toLowerCase();
  return override === null
    ? { current, source: current, overridden: false }
    : { current, source: (source ?? listed).toLowerCase(), overridden: true };
}

/**
 * A row's two colours. The list already carries any override, so with no override row its
 * colours are the source's; with one, the source comes from the override row.
 */
export function rowColors(collection: Listed, override: Override | undefined): RowColors {
  return {
    text: colorState(
      collection.textColor,
      override?.textColor ?? null,
      override?.source?.textColor,
    ),
    background: colorState(
      collection.backgroundColor,
      override?.backgroundColor ?? null,
      override?.source?.backgroundColor,
    ),
  };
}

/**
 * What Save sends for the two fields of a row: a colour left as it was is not sent, one typed back
 * to the source's resets its override, and any other is the new override. Null while a field is
 * not a colour.
 */
export function colorChange(colors: RowColors, fields: { text: string; background: string }) {
  const text = parseHexColor(fields.text);
  const background = parseHexColor(fields.background);
  if (text === null || background === null) return null;
  const change = (state: ColorState, value: string) => {
    if (value === state.current) return undefined;
    if (value === state.source) return null;
    return value;
  };
  const textColor = change(colors.text, text);
  const backgroundColor = change(colors.background, background);
  return {
    ...(textColor !== undefined ? { textColor } : {}),
    ...(backgroundColor !== undefined ? { backgroundColor } : {}),
  };
}
