import { checkFiltering, Filters } from "@/hooks/use-filters";
import {
  ValidClass,
  validClasses,
  validGroupBy,
  ValidSeason,
  validSeasons,
} from "@/lib/universal/cosmo/common";
import { PinObjekt, ValidObjekt } from "./universal/objekts";
import { groupBy } from "es-toolkit";
import { CosmoArtistWithMembersBFF } from "./universal/cosmo/artists";
import { getEdition } from "./utils";
import chroma from "chroma-js";

export type ObjektItem<T> = {
  type: "pin" | "item";
  item: T;
  order: number | null;
};

function parseCollectionNo(value: string) {
  const expression = /^([a-zA-Z]?)(\d{3})([azAZ]?)$/;
  const match = value.match(expression);
  if (!match) return null;
  const [, seasonCode, collectionNo, type] = match;
  return {
    seasonCode,
    collectionNo,
    type,
  };
}

function parseSerial(value: string) {
  const expression = /\d+/;
  const match = value.match(expression);
  if (!match) return null;
  return parseInt(match[0]);
}

function getObjektBreakdown(objekt: ValidObjekt) {
  return {
    collectionNo: objekt.collectionNo.substring(0, 3).toLowerCase(),
    seasonCode: objekt.season.charAt(0).toLowerCase(),
    type: objekt.collectionNo.charAt(3).toLowerCase(),
  };
}

const searchFilter = (keyword: string, objekt: ValidObjekt) => {
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
      type: start.type || "a",
    };

    const endBreakdown = {
      collectionNo: end.collectionNo,
      seasonCode: end.seasonCode || start.seasonCode || "z",
      type: end.type || start.type || "z",
    };

    return (
      objektBreakdown.collectionNo >= startBreakdown.collectionNo &&
      objektBreakdown.collectionNo <= endBreakdown.collectionNo &&
      objektBreakdown.seasonCode >= startBreakdown.seasonCode &&
      objektBreakdown.seasonCode <= endBreakdown.seasonCode &&
      objektBreakdown.type >= startBreakdown.type &&
      objektBreakdown.type <= endBreakdown.type
    );
  }

  return objekt.tags?.some((value) => value.toLowerCase() === keyword);
};

const getSortDate = <T extends ValidObjekt>(obj: T) =>
  "receivedAt" in obj
    ? new Date(obj.receivedAt).getTime()
    : new Date(obj.createdAt).getTime();

export function filterObjekts<T extends ValidObjekt>(
  filters: Filters,
  objekts: T[]
): T[] {
  const queries = (filters.search ?? "")
    .toLowerCase()
    .split(",")
    .map((group) =>
      group
        .trim()
        .split(" ")
        .map((term) => term.trim())
        .filter(Boolean)
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
      !filters.artist
        .map((b) => b.toLowerCase())
        .includes(a.artist.toLowerCase())
    ) {
      return false;
    }

    if (filters.class && !filters.class.includes(a.class as ValidClass))
      return false;

    if (filters.season && !filters.season.includes(a.season as ValidSeason))
      return false;

    if (filters.on_offline && !filters.on_offline.includes(a.onOffline))
      return false;

    if (filters.transferable && (!("transferable" in a) || !a.transferable))
      return false;

    if (
      filters.edition &&
      (a.class !== "First" ||
        !filters.edition.includes(getEdition(a.collectionNo)!))
    ) {
      return false;
    }

    if (queries.length > 0) {
      const matchesQuery = queries.some((group) =>
        group.every((term) =>
          term.startsWith("!")
            ? !searchFilter(term.slice(1), a)
            : searchFilter(term, a)
        )
      );
      if (!matchesQuery) return false;
    }

    if (targetColor) {
      const color = chroma(a.backgroundColor);
      const deltaE = chroma.deltaE(targetColor, color);
      if (deltaE > (filters.colorSensitivity ?? 7)) return false;
    }

    return true;
  });
}

function defaultSortObjekts<T extends ValidObjekt>(
  objekts: T[],
  artists: CosmoArtistWithMembersBFF[]
) {
  // default sort and season sort
  objekts = objekts
    .toSorted((a, b) => compareMember(a.member, b.member, "asc", artists))
    .toSorted((a, b) => b.collectionNo.localeCompare(a.collectionNo))
    .toSorted((a, b) => seasonSort(a.season, b.season, "desc"));
  return objekts;
}

function sortObjekts<T extends ValidObjekt>(
  filters: Filters,
  objekts: T[],
  artists: CosmoArtistWithMembersBFF[]
) {
  // default sort and season sort
  objekts = defaultSortObjekts(objekts, artists);

  const sort = filters.sort ?? "date";
  const sortDir = filters.sort_dir ?? "desc";

  if (sort === "date") {
    if (sortDir === "desc") {
      objekts = objekts.toSorted((a, b) => getSortDate(b) - getSortDate(a));
    } else {
      objekts = objekts.toSorted((a, b) => getSortDate(a) - getSortDate(b));
    }
  } else if (sort === "season") {
    // for desc, use default
    if (sortDir === "asc") {
      // sort by season -> collectionNo
      objekts = objekts
        .toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo))
        .toSorted((a, b) => seasonSort(a.season, b.season, "asc"));
    }
  } else if (sort === "collectionNo") {
    if (sortDir === "desc") {
      objekts = objekts.toSorted((a, b) =>
        b.collectionNo.localeCompare(a.collectionNo)
      );
    } else {
      objekts = objekts.toSorted((a, b) =>
        a.collectionNo.localeCompare(b.collectionNo)
      );
    }
  } else if (sort === "serial") {
    if (sortDir === "desc") {
      objekts = objekts.toSorted((a, b) =>
        "serial" in a && "serial" in b ? b.serial - a.serial : 0
      );
    } else {
      objekts = objekts.toSorted((a, b) =>
        "serial" in a && "serial" in b ? a.serial - b.serial : 0
      );
    }
  } else if (sort === "member") {
    objekts = objekts.toSorted((a, b) => {
      return compareMember(a.member, b.member, sortDir, artists);
    });
  }

  return objekts;
}

function sortDuplicate<T extends ValidObjekt>(
  filters: Filters,
  objekts: T[][]
) {
  const sort = filters.sort ?? "date";
  const sortDir = filters.sort_dir ?? "desc";

  if (sort === "duplicate") {
    if (sortDir === "desc")
      objekts = objekts.toSorted((a, b) => b.length - a.length);
    else objekts = objekts.toSorted((a, b) => a.length - b.length);
  }

  return objekts;
}

export function shapeObjekts<T extends ValidObjekt>(
  filters: Filters,
  objekts: T[],
  artists: CosmoArtistWithMembersBFF[],
  pins: PinObjekt[] = []
): [string, ObjektItem<T[]>[]][] {
  // 1. filter all
  // 2. group by key
  // 3. sort the group
  // 4. sort the items
  // 5. group by duplicate
  // 6. sort by duplicate
  // 7. map to ObjektItem<T[]>
  // 8. sort pin objekt

  // filter objekts
  const fliteredObjekts = filterObjekts(filters, objekts);

  // group by key
  let groupByKey: Record<string, T[]>;
  if (filters.group_by) {
    groupByKey = groupBy(fliteredObjekts, (objekt) => {
      return filters.group_by === "seasonCollectionNo"
        ? `${objekt.season} ${objekt.collectionNo}`
        : objekt[filters.group_by!];
    });
  } else {
    groupByKey = groupBy(fliteredObjekts, () => "");
  }

  // sort the group
  const groupDir = filters.group_dir ?? "desc";
  const groupByKeySorted = Object.entries(groupByKey).toSorted(
    ([keyA], [keyB]) => {
      if (filters.group_by === "member") {
        return compareMember(keyA, keyB, groupDir, artists);
      }

      if (filters.group_by === "class") {
        return classSort(keyA, keyB, groupDir);
      }

      if (filters.group_by === "season") {
        return seasonSort(keyA, keyB, groupDir);
      }

      if (groupDir === "desc") return keyB.localeCompare(keyA);
      return keyA.localeCompare(keyB);
    }
  );

  return groupByKeySorted.map(([key, keyObjekts]) => {
    // sort objekts
    const sortedObjekts = sortObjekts(filters, keyObjekts, artists);

    // group by duplicate
    let group: T[][];
    if (filters.grouped) {
      group = Object.values(groupBy(sortedObjekts, (a) => a.collectionId));
    } else {
      group = sortedObjekts.map((objekt) => [objekt]);
    }

    // sort duplicate objekts
    const sortedDuplicateObjekts = sortDuplicate(filters, group);

    // map T[] to ObjektItem<T[]>
    let items: ObjektItem<T[]>[] = sortedDuplicateObjekts.map((objekts) => {
      const [objekt] = objekts;
      const pinObjekt = pins.find((pin) => pin.tokenId === objekt.id);
      const isPinned = pinObjekt !== undefined;
      return {
        type: isPinned ? "pin" : "item",
        item: objekts,
        order: isPinned ? pinObjekt.order : null,
      };
    });

    if (pins.length > 0) {
      // if not filtering, pins should show first
      const isFiltering = checkFiltering(filters);
      if (!isFiltering) {
        // show/hide pins, hide pins mean stop sorting pins at first
        if (!filters.hidePin) {
          items = [
            ...items
              .filter((item) => item.type === "pin")
              .toSorted((a, b) => (a.order && b.order ? b.order - a.order : 0)),
            ...items.filter((item) => item.type === "item"),
          ];
        }
      }
    }

    return [key, items];
  });
}

function compareMember(
  memberA: string,
  memberB: string,
  direction: "asc" | "desc",
  artists: CosmoArtistWithMembersBFF[]
) {
  const memberOrderA =
    artists
      .flatMap((a) => a.artistMembers)
      .find((member) => member.name === memberA)?.order ?? Infinity;

  const memberOrderB =
    artists
      .flatMap((a) => a.artistMembers)
      .find((member) => member.name === memberB)?.order ?? Infinity;

  if (direction == "desc") return memberOrderB - memberOrderA;
  return memberOrderA - memberOrderB;
}

function compareByArray<T>(
  valid: readonly T[],
  a: T,
  b: T,
  dir: "asc" | "desc"
) {
  const posA = valid.findIndex((p) => p === a);
  const posB = valid.findIndex((p) => p === b);

  if (dir == "desc") return posB - posA;
  return posA - posB;
}

function seasonSort(a: string, b: string, dir: "asc" | "desc") {
  return compareByArray(validSeasons, a, b, dir);
}

function classSort(a: string, b: string, dir: "asc" | "desc") {
  return compareByArray(validClasses, a, b, dir);
}

export function shapeProgressCollections<T extends ValidObjekt>(
  artists: CosmoArtistWithMembersBFF[],
  filters: Filters,
  objekts: T[]
): [string, T[]][] {
  objekts = filterObjekts(filters, objekts).filter(
    (a) => !["Welcome", "Zero"].includes(a.class)
  );

  const groupBys = filters.group_bys?.toSorted(
    (a, b) =>
      validGroupBy.findIndex((c) => c === a) -
      validGroupBy.findIndex((c) => c === b)
  ) ?? ["member", "season", "class"];

  const grouped = groupBy(objekts, (a) =>
    groupBys.map((key) => a[key as keyof typeof a]).join(" ")
  );

  return (
    Object.entries(grouped)
      .filter(([, objekts]) => objekts.length > 0)
      // sort by member -> season -> class
      .toSorted(([, [objektA]], [, [objektB]]) =>
        groupBys.includes("class")
          ? classSort(objektA.class, objektB.class, "asc")
          : 0
      )
      .toSorted(([, [objektA]], [, [objektB]]) =>
        groupBys.includes("season")
          ? seasonSort(objektA.season, objektB.season, "desc")
          : 0
      )
      .toSorted(([, [objektA]], [, [objektB]]) =>
        groupBys.includes("member")
          ? compareMember(objektA.member, objektB.member, "asc", artists)
          : 0
      )
      .map(([key, objekts]) => [key, defaultSortObjekts(objekts, artists)])
  );
}
