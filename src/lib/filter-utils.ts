import chroma from "chroma-js";
import { groupBy } from "es-toolkit";
import type { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { checkFiltering, type Filters } from "@/hooks/use-filters";
import {
  type ValidClass,
  type ValidSeason,
  validClasses,
  validGroupBy,
  validSeasons,
} from "@/lib/universal/cosmo/common";
import type { CosmoArtistWithMembersBFF } from "./universal/cosmo/artists";
import type { PinObjekt, ValidObjekt } from "./universal/objekts";
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
  return parseInt(match[0]);
}

function getObjektBreakdown(objekt: ValidObjekt) {
  return {
    collectionNo: objekt.collectionNo.substring(0, 3).toLowerCase(),
    seasonCode: objekt.season.charAt(0).toLowerCase(),
    seasonNumber: Number(objekt.season.slice(-2)),
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
};

const getSortDate = <T extends ValidObjekt>(obj: T) =>
  "receivedAt" in obj ? new Date(obj.receivedAt).getTime() : new Date(obj.createdAt).getTime();

export function filterObjekts<T extends ValidObjekt>(filters: Filters, objekts: T[]): T[] {
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
      const color = chroma(a.backgroundColor);
      const deltaE = chroma.deltaE(targetColor, color);
      if (deltaE > (filters.colorSensitivity ?? 7)) return false;
    }

    return true;
  });
}

function defaultSortObjekts<T extends ValidObjekt>(
  data: T[],
  artists: CosmoArtistWithMembersBFF[],
) {
  let objekts = data;

  // default sort and season sort
  objekts = objekts
    .toSorted((a, b) => compareMember(a.member, b.member, artists))
    .toSorted((a, b) => b.collectionNo.localeCompare(a.collectionNo))
    .toSorted((a, b) => seasonSort(b.season, a.season));
  return objekts;
}

function sortObjekts<T extends ValidObjekt>(
  filters: Filters,
  data: T[],
  artists: CosmoArtistWithMembersBFF[],
) {
  // default sort and season sort
  let objekts = defaultSortObjekts(data, artists);

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
        .toSorted((a, b) => seasonSort(a.season, b.season));
    }
  } else if (sort === "collectionNo") {
    if (sortDir === "desc") {
      objekts = objekts.toSorted((a, b) => b.collectionNo.localeCompare(a.collectionNo));
    } else {
      objekts = objekts.toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo));
    }
  } else if (sort === "serial") {
    if (sortDir === "desc") {
      objekts = objekts.toSorted((a, b) =>
        "serial" in a && "serial" in b ? b.serial - a.serial : 0,
      );
    } else {
      objekts = objekts.toSorted((a, b) =>
        "serial" in a && "serial" in b ? a.serial - b.serial : 0,
      );
    }
  } else if (sort === "member") {
    objekts = objekts.toSorted((a, b) => {
      return sortDir === "asc"
        ? compareMember(a.member, b.member, artists)
        : compareMember(b.member, a.member, artists);
    });
  }

  return objekts;
}

function sortDuplicate<T extends ValidObjekt>(filters: Filters, data: T[][]) {
  const sort = filters.sort ?? "date";
  const sortDir = filters.sort_dir ?? "desc";

  let objekts = data;

  if (sort === "duplicate") {
    if (sortDir === "desc") objekts = objekts.toSorted((a, b) => b.length - a.length);
    else objekts = objekts.toSorted((a, b) => a.length - b.length);
  }

  return objekts;
}

export function shapeObjekts<T extends ValidObjekt>(
  filters: Filters,
  objekts: T[],
  artists: CosmoArtistWithMembersBFF[],
  getArtist: ReturnType<typeof useCosmoArtist>["getArtist"],
  pins: PinObjekt[] = [],
  lockedObjekts: PinObjekt[] = [],
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
        : filters.group_by === "artist"
          ? (getArtist(objekt.artist)?.title ?? objekt.artist)
          : objekt[filters.group_by!];
    });
  } else {
    groupByKey = groupBy(fliteredObjekts, () => "");
  }

  // sort the group
  const groupDir = filters.group_dir ?? "desc";
  const groupByKeySorted = Object.entries(groupByKey).toSorted(([keyA], [keyB]) => {
    if (filters.group_by === "member") {
      return groupDir === "asc"
        ? compareMember(keyA, keyB, artists)
        : compareMember(keyB, keyA, artists);
    }

    if (filters.group_by === "class") {
      return groupDir === "asc" ? classSort(keyA, keyB) : classSort(keyB, keyA);
    }

    if (filters.group_by === "season") {
      return groupDir === "asc" ? seasonSort(keyA, keyB) : seasonSort(keyB, keyA);
    }

    if (groupDir === "desc") return keyB.localeCompare(keyA);
    return keyA.localeCompare(keyB);
  });

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
      const lockedObjekt = lockedObjekts.find((lock) => lock.tokenId === objekt.id);
      const isPin = pinObjekt !== undefined;
      const isLocked = lockedObjekt !== undefined;
      return {
        isPin: isPin,
        isLocked: isLocked,
        item: objekts,
        order: isPin ? pinObjekt.order : null,
      };
    });

    if (pins.length > 0) {
      // if not filtering, pins should show first
      const isFiltering = checkFiltering(filters);
      if (!isFiltering && !filters.hidePin) {
        items = [
          ...items
            .filter((item) => item.isPin === true)
            .toSorted((a, b) => (a.order && b.order ? b.order - a.order : 0)),
          ...items.filter((item) => item.isPin === false),
        ];
      }
    }

    // filter locked / unlocked
    if (filters.locked !== null) {
      items = items.filter((item) =>
        filters.locked !== null ? item.isLocked === filters.locked : true,
      );
    }

    return [key, items];
  });
}

function compareMember(memberA: string, memberB: string, artists: CosmoArtistWithMembersBFF[]) {
  const memberOrderA =
    artists.flatMap((a) => a.artistMembers).find((member) => member.name === memberA)?.order ??
    Infinity;

  const memberOrderB =
    artists.flatMap((a) => a.artistMembers).find((member) => member.name === memberB)?.order ??
    Infinity;

  return memberOrderA - memberOrderB;
}

function compareByArray<T>(valid: readonly T[], a: T, b: T) {
  const posA = valid.findIndex((p) => p === a);
  const posB = valid.findIndex((p) => p === b);

  return posA - posB;
}

function seasonSort(a: string, b: string) {
  return compareByArray(validSeasons, a, b);
}

function classSort(a: string, b: string) {
  return compareByArray(validClasses, a, b);
}

export function shapeProgressCollections<T extends ValidObjekt>(
  artists: CosmoArtistWithMembersBFF[],
  filters: Filters,
  data: T[],
  getArtist: ReturnType<typeof useCosmoArtist>["getArtist"],
): [string, T[]][] {
  let objekts = data;

  objekts = filterObjekts(filters, objekts).filter(
    (a) => ["Welcome", "Zero"].includes(a.class) === false,
  );

  const groupBys = filters.group_bys?.toSorted(
    (a, b) => validGroupBy.findIndex((c) => c === a) - validGroupBy.findIndex((c) => c === b),
  ) ?? ["member", "season", "class"];

  const grouped = groupBy(objekts, (objekt) =>
    groupBys
      .map((key) =>
        key === "artist"
          ? (getArtist(objekt.artist)?.title ?? objekt.artist)
          : objekt[key as keyof typeof objekt],
      )
      .join(" "),
  );

  return (
    Object.entries(grouped)
      .filter(([, objekts]) => objekts.length > 0)
      // sort by member -> season -> class
      .toSorted(([, [objektA]], [, [objektB]]) =>
        groupBys.includes("class") ? classSort(objektA.class, objektB.class) : 0,
      )
      .toSorted(([, [objektA]], [, [objektB]]) =>
        groupBys.includes("season") ? seasonSort(objektB.season, objektA.season) : 0,
      )
      .toSorted(([, [objektA]], [, [objektB]]) =>
        groupBys.includes("member") ? compareMember(objektA.member, objektB.member, artists) : 0,
      )
      .map(([key, objekts]) => [
        key,
        objekts
          .toSorted((a, b) => compareMember(a.member, b.member, artists))
          .toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo))
          .toSorted((a, b) => seasonSort(b.season, a.season)),
      ])
  );
}
