import chroma from "chroma-js";
import type { Filters } from "@/hooks/use-filters";
import {
  type ValidClass,
  type ValidSeason,
  validClasses,
  validSeasons,
} from "@/lib/universal/cosmo/common";
import type { ValidObjekt } from "./universal/objekts";
import { getEdition } from "./utils";

export type ObjektItem<T> = {
  item: T;
  isPin: boolean;
  isLocked: boolean;
  order: number | null;
};

function parseCollectionNo(value: string) {
  const expression = /^([a-zA-Z]*)(\d{3})([azAZ]?)$/;
  const match = value.match(expression);
  if (!match) return null;
  const [, seasonCode, collectionNo, type] = match;
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

function searchFilter(keyword: string, objekt: ValidObjekt) {
  // Handle serial search (e.g. #1-20)
  if (keyword.startsWith("#") && "serial" in objekt) {
    const [start, end] = keyword.split("-").map(parseSerial);
    if (start === null) return false;
    return objekt.serial >= start && objekt.serial <= (end ?? start);
  }

  // Handle collection range search (e.g. 301z-302z)
  // legacy, doesn't support for atom02
  if (!keyword.startsWith("#") && keyword.includes("-")) {
    const [start, end] = keyword.split("-").map(parseCollectionNo);
    if (!start || !end) return false;

    const objektBreakdown = getObjektBreakdown(objekt);

    const startBreakdown = {
      collectionNo: start.collectionNo,
      seasonCode: start.seasonCode || "a",
      seasonNumber: start.seasonNumber,
      type: start.type || "a",
    };

    const endBreakdown = {
      collectionNo: end.collectionNo,
      seasonCode: end.seasonCode || start.seasonCode || "z",
      seasonNumber: end.seasonNumber || start.seasonNumber || 99,
      type: end.type || start.type || "z",
    };

    return (
      objekt.artist !== "idntt" &&
      objektBreakdown.collectionNo >= startBreakdown.collectionNo &&
      objektBreakdown.collectionNo <= endBreakdown.collectionNo &&
      objektBreakdown.seasonCode >= startBreakdown.seasonCode &&
      objektBreakdown.seasonCode <= endBreakdown.seasonCode &&
      objektBreakdown.type >= startBreakdown.type &&
      objektBreakdown.type <= endBreakdown.type &&
      objektBreakdown.seasonNumber >= startBreakdown.seasonNumber &&
      objektBreakdown.seasonNumber <= endBreakdown.seasonNumber
    );
  }

  return objekt.tags?.some((value) => value.toLowerCase() === keyword);
}

export function getSortDate(obj: ValidObjekt) {
  return "receivedAt" in obj
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

  return objekts.filter((a) => {
    if (filters.member && !filters.member.includes(a.member)) return false;

    if (
      filters.artist &&
      !filters.artist.map((b) => b.toLowerCase()).includes(a.artist.toLowerCase())
    ) {
      return false;
    }

    if (filters.class && !filters.class.includes(a.class as ValidClass)) return false;

    if (filters.season && !filters.season.includes(a.season as ValidSeason)) return false;

    if (filters.on_offline && !filters.on_offline.includes(a.onOffline)) return false;

    if (filters.transferable && (!("transferable" in a) || !a.transferable)) return false;

    if (
      filters.edition &&
      (a.class !== "First" || !filters.edition.includes(getEdition(a.collectionNo)!))
    ) {
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

export function seasonSort(a: string, b: string) {
  return compareByArray(validSeasons, a, b);
}

export function classSort(a: string, b: string) {
  return compareByArray(validClasses, a, b);
}
