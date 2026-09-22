import { toCanonicalArtist } from "@repo/api/schemas/artist";
import {
  validArtists,
  validCustomSorts,
  validEdition,
  validGroupBy,
  validOnlineTypes,
  validSortDirection,
} from "@repo/cosmo/types/common";
import * as z from "zod";

/**
 * Both URL spellings have to parse: the comma-joined `?member=a,b` a shared
 * link carries, and the repeated `?member=a&member=b`. No facet value contains
 * a comma, so splitting is lossless.
 */
function toList(value: unknown): unknown[] {
  const entries = Array.isArray(value) ? value : [value];
  const items: unknown[] = [];
  for (const entry of entries) {
    for (const part of typeof entry === "string" ? entry.split(",") : [entry]) {
      const item = typeof part === "string" ? part.trim() : part;
      if (item === "" || items.includes(item)) continue;
      items.push(item);
    }
  }
  return items;
}

/**
 * A programmatic patch arrives as the parsed value already. Every field also
 * `.catch`es, so one unreadable parameter drops instead of failing the whole
 * navigation — including an array that splits down to nothing.
 */
function list<T extends z.ZodType>(item: T) {
  return z.preprocess(toList, z.array(item).min(1)).optional().catch(undefined);
}

function flag() {
  return z
    .preprocess((value) => (typeof value === "string" ? value === "true" : value), z.boolean())
    .optional()
    .catch(undefined);
}

function num() {
  return z
    .preprocess((value) => (typeof value === "string" ? Number(value) : value), z.number().finite())
    .optional()
    .catch(undefined);
}

function text() {
  return z.string().min(1).optional().catch(undefined);
}

const artistValue = z.string().transform(toCanonicalArtist).pipe(z.enum(validArtists));

const editionValue = z.preprocess(
  (value) => (typeof value === "string" ? Number(value) : value),
  z.literal(validEdition),
);

/**
 * Every filter, sort and search value the surfaces share, under the parameter
 * names `apps/website` puts on the URL, so a website link opens the same view.
 * Routes declare it as their `validateSearch`.
 */
export const filterSearchSchema = z.object({
  member: list(z.string()),
  artist: list(artistValue),
  season: list(z.string()),
  class: list(z.string()),
  collection: list(z.string()),
  on_offline: list(z.enum(validOnlineTypes)),
  edition: list(editionValue),
  search: text(),
  color: text(),
  colorSensitivity: num(),
  transferable: flag(),
  grouped: flag(),
  locked: flag(),
  priced: flag(),
  unowned: flag(),
  missing: flag(),
  floor_min: num(),
  floor_max: num(),
  sort: z.enum(validCustomSorts).optional().catch(undefined),
  sort_dir: z.enum(validSortDirection).optional().catch(undefined),
  group_by: z.enum(validGroupBy).optional().catch(undefined),
  group_dir: z.enum(validSortDirection).optional().catch(undefined),
  at: text(),
});

export type FilterSearch = z.infer<typeof filterSearchSchema>;

type FilterKey = keyof FilterSearch;

const FILTER_KEYS = Object.keys(filterSearchSchema.shape) as FilterKey[];

/** No filter set: also the patch `useResetFilters` writes, minus `at`. */
export const defaultFilters: FilterSearch = Object.fromEntries(
  FILTER_KEYS.map((key) => [key, undefined]),
) as FilterSearch;

export const DEFAULT_SORT = "date";
export const DEFAULT_SORT_DIR = "desc";
/** the Delta-E a colour filter uses until the Sensitivity slider is moved */
export const DEFAULT_COLOR_SENSITIVITY = 7;
/** the slider's ends; 1 is "this exact swatch", 20 is "this family of hues" */
export const COLOR_SENSITIVITY_RANGE = { min: 1, max: 20 } as const;

export function isFiltering(filters: FilterSearch): boolean {
  return FILTER_KEYS.some((key) => filters[key] !== undefined);
}
