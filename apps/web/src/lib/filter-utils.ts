import type { ValidObjekt } from "@repo/lib/types/objekt";

import chroma from "chroma-js";

import type { Filters } from "@/hooks/use-filters";

import { isObjektOwned } from "./objekt-utils";

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
  return isObjektOwned(obj)
    ? new Date(obj.receivedAt).getTime()
    : new Date(obj.createdAt).getTime();
}

export function filterObjekts(filters: Filters, objekts: ValidObjekt[]): ValidObjekt[] {
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

  const memberSet = filters.member ? new Set(filters.member) : null;
  const artistSet = filters.artist ? new Set(filters.artist.map((a) => a.toLowerCase())) : null;
  const classSet = filters.class ? new Set(filters.class) : null;
  const seasonSet = filters.season ? new Set(filters.season) : null;
  const onOfflineSet = filters.on_offline ? new Set(filters.on_offline) : null;
  const editionSet = filters.edition ? new Set(filters.edition) : null;

  return objekts.filter((a) => {
    if (memberSet && !memberSet.has(a.member)) return false;

    if (artistSet && !artistSet.has(a.artist.toLowerCase())) return false;

    if (classSet && !classSet.has(a.class)) return false;

    if (seasonSet && !seasonSet.has(a.season)) return false;

    if (onOfflineSet && !onOfflineSet.has(a.onOffline)) return false;

    if (filters.transferable && isObjektOwned(a) && !a.transferable) return false;

    if (editionSet && (!a.edition || !editionSet.has(a.edition))) {
      return false;
    }

    if (filters.locked !== null && isObjektOwned(a) && a.isLocked !== filters.locked) {
      return false;
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
        if (deltaE > (filters.colorSensitivity ?? 7)) return false;
      } catch {
        console.error(`Error parsing background color for ${a.slug}`, a.backgroundColor);
        return false;
      }
    }

    return true;
  });
}

export function compareByArray<T>(valid: readonly T[], a: T, b: T) {
  const posA = valid.indexOf(a);
  const posB = valid.indexOf(b);
  return posA - posB;
}
