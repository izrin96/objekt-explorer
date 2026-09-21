import type { ValidObjekt } from "@repo/lib/types/objekt";
import chroma from "chroma-js";

import { isObjektOwned } from "@/features/objekt/objekt-utils";

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

function searchFilter(keyword: string, objekt: ValidObjekt) {
  // Handle serial search (e.g. #1-20)
  if (keyword.startsWith("#") && isObjektOwned(objekt)) {
    const [start, end] = keyword.split("-").map(parseSerial);
    if (!start) return false;
    return objekt.serial >= start && objekt.serial <= (end ?? start);
  }

  // Handle collection range search (e.g. 301z-302z, aa201z-204z, a201z-aa204z)
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

    // collectionNo + type range
    return (
      breakdown.collectionNo >= start.collectionNo &&
      breakdown.collectionNo <= end.collectionNo &&
      breakdown.type >= (start.type || "a") &&
      breakdown.type <= (end.type || start.type || "z")
    );
  }

  return objekt.tags?.some((value) => value === keyword);
}

export function getSortDate(obj: ValidObjekt) {
  return obj.order
    ? obj.order
    : isObjektOwned(obj)
      ? new Date(obj.receivedAt).getTime()
      : new Date(obj.createdAt).getTime();
}

export function filterObjekts(filters: FilterSearch, objekts: ValidObjekt[]): ValidObjekt[] {
  const queries = (filters.search ?? "")
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

  // Parse target color once outside the filter loop
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

    if (queries.length > 0) {
      const matchesQuery = queries.some((group) =>
        group.every((term) =>
          term.startsWith("!") ? !searchFilter(term.slice(1), a) : searchFilter(term, a),
        ),
      );
      if (!matchesQuery) return false;
    }

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

export function sortObjekts(
  data: ValidObjekt[],
  filters: FilterSearch,
  compareMember: (a: string, b: string) => number,
  compareSeason: (a: string, b: string) => number,
  rarityMap?: Map<string, number>,
): ValidObjekt[] {
  let objekts = data;

  const sort = filters.sort ?? DEFAULT_SORT;
  const sortDir = filters.sort_dir ?? DEFAULT_SORT_DIR;

  if (sort === "date" || sort === "rare") {
    if (sortDir === "desc") {
      objekts = objekts.toSorted((a, b) => getSortDate(b) - getSortDate(a));
    } else {
      objekts = objekts.toSorted((a, b) => getSortDate(a) - getSortDate(b));
    }

    if (sort === "rare") {
      if (!rarityMap) return [];

      objekts = objekts.toSorted((a, b) => {
        const countA = rarityMap.get(a.slug) ?? Infinity;
        const countB = rarityMap.get(b.slug) ?? Infinity;

        if (sortDir === "asc") {
          return countA - countB;
        } else {
          return countB - countA;
        }
      });
    }
  } else if (sort === "season" || sort === "collectionNo") {
    objekts = objekts.toSorted((a, b) => compareMember(a.member, b.member));

    if (sortDir === "asc") {
      objekts = objekts.toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo));
      if (sort === "season") {
        objekts = objekts.toSorted((a, b) => compareSeason(a.season, b.season));
      }
    } else {
      objekts = objekts.toSorted((a, b) => b.collectionNo.localeCompare(a.collectionNo));
      if (sort === "season") {
        objekts = objekts.toSorted((a, b) => compareSeason(b.season, a.season));
      }
    }
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
  } else if (sort === "member") {
    objekts = objekts
      .toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo))
      .toSorted((a, b) => compareSeason(a.season, b.season));

    if (sortDir === "asc") {
      objekts = objekts.toSorted((a, b) => compareMember(a.member, b.member));
    } else {
      objekts = objekts.toSorted((a, b) => compareMember(b.member, a.member));
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
    objekts = objekts.toSorted((a, b) => {
      const countA = a.listingCount ?? 0;
      const countB = b.listingCount ?? 0;
      return sortDir === "asc" ? countA - countB : countB - countA;
    });
  }

  return objekts;
}
