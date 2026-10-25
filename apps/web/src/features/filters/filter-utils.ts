import type { GridObjekt, ValidObjekt } from "@repo/lib/types/objekt";
import chroma from "chroma-js";

import { isObjektOwned } from "@/features/objekt/objekt-utils";

import { isListedWithin } from "./listed-window";
import {
  DEFAULT_COLOR_SENSITIVITY,
  DEFAULT_SORT,
  DEFAULT_SORT_DIR,
  type FilterSearch,
} from "./search-schema";

function parseCollectionNo(value: string) {
  const expression = /^([a-zA-Z]*)(\d{3})([azAZ]?)$/;
  const match = value.match(expression);
  if (!match) return null;
  const [, seasonCode = "", collectionNo = "", type = ""] = match;
  return {
    seasonCode: seasonCode.length > 0 ? seasonCode.charAt(0) : "",
    seasonNumber: seasonCode.length,
    collectionNo,
    type,
  };
}

function parseSerial(value: string) {
  const expression = /\d+/;
  const match = value.match(expression);
  if (!match) return null;
  return Number(match[0]);
}

function getObjektBreakdown(objekt: ValidObjekt) {
  return {
    collectionNo: objekt.collectionNo.substring(0, 3).toLowerCase(),
    seasonCode: objekt.season.charAt(0).toLowerCase(),
    seasonNumber: Number(objekt.season.slice(-2)),
    type: objekt.collectionNo.charAt(3).toLowerCase(),
  };
}

function toSeasonKey(seasonCode: string, seasonNumber: number) {
  return String(seasonNumber).padStart(2, "0") + seasonCode;
}

/**
 * The grammar a term accepts: `#n` / `#n-m` is a serial or serial range,
 * `a201z-aa204z` a collection range with optional season codes on either end,
 * and anything else is matched against the objekt's tags.
 */
function searchFilter(keyword: string, objekt: GridObjekt) {
  if (keyword.startsWith("#") && isObjektOwned(objekt)) {
    const [start, end] = keyword.split("-").map(parseSerial);
    if (!start) return false;
    return objekt.serial >= start && objekt.serial <= (end ?? start);
  }

  if (!keyword.startsWith("#") && keyword.includes("-")) {
    const [start, end] = keyword.split("-").map(parseCollectionNo);
    if (!start || !end) return false;
    if (objekt.artist === "idntt") return false;

    const breakdown = getObjektBreakdown(objekt);
    const hasSeason = start.seasonNumber > 0 || end.seasonNumber > 0;

    if (hasSeason) {
      const startSeasonKey = toSeasonKey(
        start.seasonCode || end.seasonCode || "a",
        start.seasonNumber || end.seasonNumber,
      );
      const endSeasonKey = toSeasonKey(
        end.seasonCode || start.seasonCode || "z",
        end.seasonNumber || start.seasonNumber || 99,
      );
      const objectSeasonKey = toSeasonKey(breakdown.seasonCode, breakdown.seasonNumber);
      if (objectSeasonKey < startSeasonKey || objectSeasonKey > endSeasonKey) return false;
    }

    return (
      breakdown.collectionNo >= start.collectionNo &&
      breakdown.collectionNo <= end.collectionNo &&
      breakdown.type >= (start.type || "a") &&
      breakdown.type <= (end.type || start.type || "z")
    );
  }

  return objekt.tags.some((value) => value === keyword);
}

function getSortDate(obj: GridObjekt) {
  return obj.entryId !== undefined
    ? obj.entryId
    : isObjektOwned(obj)
      ? new Date(obj.receivedAt).getTime()
      : new Date(obj.createdAt).getTime();
}

/**
 * The quick search as a predicate, or null when it is blank: comma-separated groups match
 * if any does, a group's space-separated terms all have to, and `!` negates a term.
 */
export function searchMatcher(search: string | undefined) {
  const queries = (search ?? "")
    .toLowerCase()
    .split(",")
    .map((group) =>
      group
        .trim()
        .split(" ")
        .map((term) => term.trim())
        .filter(Boolean),
    )
    .filter((group) => group.length > 0);
  if (queries.length === 0) return null;
  return (objekt: GridObjekt) =>
    queries.some((group) =>
      group.every((term) =>
        term.startsWith("!") ? !searchFilter(term.slice(1), objekt) : searchFilter(term, objekt),
      ),
    );
}

function currentUnixSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function filterObjekts<T extends GridObjekt>(
  filters: FilterSearch,
  objekts: T[],
  nowSec: number = currentUnixSeconds(),
): T[] {
  const matchesSearch = searchMatcher(filters.search);

  let targetColor: chroma.Color | null = null;
  if (filters.color) {
    try {
      targetColor = chroma(filters.color);
    } catch (e) {
      console.error("Invalid color format:", e);
    }
  }

  const memberSet = filters.member ? new Set(filters.member.map((a) => a.toLowerCase())) : null;
  const artistSet = filters.artist ? new Set(filters.artist.map((a) => a.toLowerCase())) : null;
  const classSet = filters.class ? new Set(filters.class) : null;
  const seasonSet = filters.season ? new Set(filters.season) : null;
  const onOfflineSet = filters.on_offline ? new Set(filters.on_offline) : null;
  const editionSet = filters.edition ? new Set(filters.edition) : null;
  // the website narrows `collection` on the server, which this surface has no
  // request to narrow — the facet is inert unless it is applied here
  const collectionSet = filters.collection
    ? new Set(filters.collection.map((a) => a.toLowerCase()))
    : null;

  return objekts.filter((a) => {
    if (memberSet && !a.members.some((m) => memberSet.has(m.toLowerCase()))) return false;

    if (artistSet && !artistSet.has(a.artist.toLowerCase())) return false;

    if (classSet && !classSet.has(a.class)) return false;

    if (seasonSet && !seasonSet.has(a.season)) return false;

    if (collectionSet && !collectionSet.has(a.collectionNo.toLowerCase())) return false;

    if (onOfflineSet && !onOfflineSet.has(a.onOffline)) return false;

    if (filters.transferable && isObjektOwned(a) && !a.transferable) return false;
    // a counted collection is Spin's, and nothing Spin holds is transferable
    if (filters.transferable && a.copies !== undefined) return false;

    if (editionSet && (!a.edition || !editionSet.has(a.edition))) {
      return false;
    }

    if (
      filters.locked !== undefined &&
      isObjektOwned(a) &&
      (a.isLocked ?? false) !== filters.locked
    ) {
      return false;
    }

    if (filters.priced === true && (a.floorPrice === null || a.floorPrice === undefined)) {
      return false;
    }

    if (filters.floor_min !== undefined || filters.floor_max !== undefined) {
      if (a.floorPrice === null || a.floorPrice === undefined) return false;
      if (filters.floor_min !== undefined && a.floorPrice < filters.floor_min) return false;
      if (filters.floor_max !== undefined && a.floorPrice > filters.floor_max) return false;
    }

    // only market rows carry a listing time; elsewhere a stray `listed` filters nothing
    if (
      filters.listed !== undefined &&
      a.listedAt !== undefined &&
      !isListedWithin(a.listedAt, filters.listed, nowSec)
    ) {
      return false;
    }

    if (matchesSearch && !matchesSearch(a)) return false;

    if (targetColor) {
      try {
        const color = chroma(a.backgroundColor.trim());
        const deltaE = chroma.deltaE(targetColor, color);
        if (deltaE > (filters.colorSensitivity ?? DEFAULT_COLOR_SENSITIVITY)) return false;
      } catch {
        console.error(`Error parsing background color for ${a.slug}`, a.backgroundColor);
        return false;
      }
    }

    return true;
  });
}

// one collator for every comparison: `localeCompare` builds one per call
const collator = new Intl.Collator();

/**
 * Each distinct value's place under `compare`, equal values sharing one: a grid holds few members,
 * seasons and numbers, so they are compared once each rather than on every comparison.
 */
function ranks(values: Iterable<string>, compare: (a: string, b: string) => number) {
  const rank = new Map<string, number>();
  let previous: string | undefined;
  let place = 0;
  for (const value of [...new Set(values)].toSorted(compare)) {
    if (previous !== undefined && compare(previous, value) !== 0) place += 1;
    rank.set(value, place);
    previous = value;
  }
  return rank;
}

/**
 * One stable sort per mode: each comparator reads its keys most significant first, as a chain of
 * stable sorts would by sorting the least significant key first.
 */
export function sortObjekts<T extends GridObjekt>(
  data: T[],
  filters: FilterSearch,
  compareMember: (a: string, b: string) => number,
  compareSeason: (a: string, b: string) => number,
  rarityMap?: Map<string, number>,
): T[] {
  let objekts = data;

  const sort = filters.sort ?? DEFAULT_SORT;
  const sortDir = filters.sort_dir ?? DEFAULT_SORT_DIR;
  const dir = sortDir === "asc" ? 1 : -1;

  if (sort === "date" || sort === "rare") {
    if (sort === "rare" && !rarityMap) return [];
    // a date parses once per objekt, not once per comparison
    const keyed = objekts.map((objekt) => ({
      objekt,
      date: getSortDate(objekt),
      rarity: rarityMap ? (rarityMap.get(objekt.slug) ?? Infinity) : 0,
    }));
    keyed.sort((a, b) => {
      if (sort === "rare" && a.rarity !== b.rarity) return dir * (a.rarity - b.rarity);
      return dir * (a.date - b.date);
    });
    objekts = keyed.map((entry) => entry.objekt);
  } else if (sort === "season" || sort === "collectionNo" || sort === "member") {
    const member = ranks(
      objekts.map((objekt) => objekt.member),
      compareMember,
    );
    const season = ranks(
      objekts.map((objekt) => objekt.season),
      compareSeason,
    );
    const number = ranks(
      objekts.map((objekt) => objekt.collectionNo),
      collator.compare,
    );
    const keyed = objekts.map((objekt) => ({
      objekt,
      member: member.get(objekt.member)!,
      season: season.get(objekt.season)!,
      number: number.get(objekt.collectionNo)!,
    }));
    keyed.sort(
      sort === "member"
        ? // only the member follows the direction; season and number always run ascending
          (a, b) => dir * (a.member - b.member) || a.season - b.season || a.number - b.number
        : // the member always runs in roster order, whichever way the rest runs
          (a, b) =>
            (sort === "season" ? dir * (a.season - b.season) : 0) ||
            dir * (a.number - b.number) ||
            a.member - b.member,
    );
    objekts = keyed.map((entry) => entry.objekt);
  } else if (sort === "serial") {
    if (sortDir === "desc") {
      objekts = objekts.toSorted((a, b) =>
        isObjektOwned(a) && isObjektOwned(b) ? b.serial - a.serial : 0,
      );
    } else {
      objekts = objekts.toSorted((a, b) =>
        isObjektOwned(a) && isObjektOwned(b) ? a.serial - b.serial : 0,
      );
    }
  } else if (sort === "price") {
    objekts = objekts.toSorted((a, b) => {
      const priceA = a.price ?? null;
      const priceB = b.price ?? null;
      if (priceA === null && priceB === null) return 0;
      if (priceA === null) return 1;
      if (priceB === null) return -1;
      return sortDir === "asc" ? priceA - priceB : priceB - priceA;
    });
  } else if (sort === "floor") {
    objekts = objekts.toSorted((a, b) => {
      const floorA = a.floorPrice ?? null;
      const floorB = b.floorPrice ?? null;
      if (floorA === null && floorB === null) return 0;
      if (floorA === null) return 1;
      if (floorB === null) return -1;
      return sortDir === "asc" ? floorA - floorB : floorB - floorA;
    });
  } else if (sort === "listedAt") {
    objekts = objekts.toSorted((a, b) => {
      const listedA = a.listedAt ?? 0;
      const listedB = b.listedAt ?? 0;
      return sortDir === "asc" ? listedA - listedB : listedB - listedA;
    });
  } else if (sort === "supply") {
    objekts = objekts.toSorted(compareSupply(sortDir));
  }

  return objekts;
}

type SupplyRow = Pick<GridObjekt, "slug" | "listingCount" | "floorPrice" | "listedAt">;

/** ties keep one order whichever way the count runs, so flipping the arrow doesn't reshuffle them */
export function compareSupply(dir: "asc" | "desc") {
  return (a: SupplyRow, b: SupplyRow): number => {
    const countA = a.listingCount ?? 0;
    const countB = b.listingCount ?? 0;
    if (countA !== countB) return dir === "asc" ? countA - countB : countB - countA;
    const floorA = a.floorPrice ?? null;
    const floorB = b.floorPrice ?? null;
    if (floorA !== floorB) {
      if (floorA === null) return 1;
      if (floorB === null) return -1;
      return floorA - floorB;
    }
    const listedA = a.listedAt ?? 0;
    const listedB = b.listedAt ?? 0;
    if (listedA !== listedB) return listedB - listedA;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  };
}
