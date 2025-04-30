import { Filters } from "@/hooks/use-filters";
import {
  ValidArtist,
  ValidClass,
  validClasses,
  validGroupBy,
  ValidSeason,
  validSeasons,
} from "@/lib/universal/cosmo/common";
import { OwnedObjekt, ValidObjekt } from "./universal/objekts";
import { groupBy } from "es-toolkit";
import { CosmoArtistWithMembersBFF } from "./universal/cosmo/artists";
import { getEdition } from "./utils";

const shortformMembers: Record<string, string> = {
  naky: "NaKyoung",
  n: "Nien",
  nk: "NaKyoung",
  tone: "Kotone",
  sulin: "Sullin",
  s: "Sullin",
  sh: "SoHyun",
  c: "Choerry",
  ch: "Choerry",
  choery: "Choerry",
  cw: "ChaeWon",
  cy: "ChaeYeon",
  sy: "SeoYeon",
  sm: "SooMin",
  so: "ShiOn",
  sa: "SeoAh",
  sl: "Sullin",
  jw: "JiWoo",
  jb: "JooBin",
  jy: "JiYeon",
  js: "JinSoul",
  dh: "DaHyun",
  kd: "Kaede",
  kl: "KimLip",
  k: "Kaede",
  hr: "HyeRin",
  hy: "HaYeon",
  hj: "HeeJin",
  hs: "HaSeul",
  yb: "YuBin",
  yj: "YeonJi",
  yy: "YooYeon",
  x: "Xinyu",
  m: "Mayu",
  l: "Lynn",
};

function getMemberShortKeys(value: string) {
  return Object.keys(shortformMembers).filter(
    (key) => shortformMembers[key] === value
  );
}

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

  // Handle collection number search
  const keywordNoBreakdown = parseCollectionNo(keyword);
  if (keywordNoBreakdown) {
    const objektBreakdown = getObjektBreakdown(objekt);
    return (
      (!keywordNoBreakdown.collectionNo ||
        objektBreakdown.collectionNo === keywordNoBreakdown.collectionNo) &&
      (!keywordNoBreakdown.seasonCode ||
        objektBreakdown.seasonCode === keywordNoBreakdown.seasonCode) &&
      (!keywordNoBreakdown.type ||
        objektBreakdown.type == keywordNoBreakdown.type)
    );
  }

  const seasonCode = objekt.season.charAt(0);
  const seasonNumber = objekt.season.slice(-2);

  const memberKeys = [
    ...getMemberShortKeys(objekt.member),
    objekt.member,
    objekt.artist,
    objekt.class,
    objekt.class.charAt(0) + "co", // sco
    objekt.season,
    seasonCode + seasonNumber, // a01
    seasonCode + parseInt(seasonNumber), // a1
    objekt.season.slice(0, -2), // atom
  ];
  return memberKeys.some((value) => value.toLowerCase() === keyword);
};

const getSortDate = <T extends ValidObjekt>(obj: T) =>
  "receivedAt" in obj
    ? new Date(obj.receivedAt).getTime()
    : new Date(obj.createdAt).getTime();

export function filterObjekts<T extends ValidObjekt>(
  filters: Filters,
  objekts: T[]
) {
  if (filters.member) {
    objekts = objekts.filter((a) => filters.member?.includes(a.member));
  }
  if (filters.artist) {
    objekts = objekts.filter((a) =>
      filters.artist?.includes(a.artist as ValidArtist)
    );
  }
  if (filters.class) {
    objekts = objekts.filter((a) =>
      filters.class?.includes(a.class as ValidClass)
    );
  }
  if (filters.season) {
    objekts = objekts.filter((a) =>
      filters.season?.includes(a.season as ValidSeason)
    );
  }
  if (filters.on_offline) {
    objekts = objekts.filter((a) => filters.on_offline?.includes(a.onOffline));
  }
  if (filters.transferable) {
    objekts = objekts.filter((a) =>
      "transferable" in a ? a.transferable : undefined
    );
  }
  if (filters.edition) {
    objekts = objekts.filter((a) =>
      a.class === "First"
        ? filters.edition?.includes(getEdition(a.collectionNo)!)
        : false
    );
  }

  if (filters.search) {
    // support OR query operation by commas
    // support AND query operation by space
    const queries = filters.search
      .toLowerCase()
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean)
      .map((query) =>
        query
          .split(" ")
          .map((a) => a.trim())
          .filter(Boolean)
      );

    if (queries.length > 0)
      objekts = objekts.filter((objekt) =>
        queries.some((s) =>
          s.every((a) =>
            // exclude by !
            a.startsWith("!")
              ? !searchFilter(a.slice(1), objekt)
              : searchFilter(a, objekt)
          )
        )
      );
  }

  return objekts;
}

function defaultSortObjekts<T extends ValidObjekt>(
  objekts: T[],
  artists: CosmoArtistWithMembersBFF[]
) {
  // default sort and season sort
  objekts = objekts
    .toSorted((a, b) => compareMember(a.member, b.member, "asc", artists))
    .toSorted((a, b) => b.collectionNo.localeCompare(a.collectionNo))
    .toSorted((a, b) => b.season.localeCompare(a.season));
  return objekts;
}

function sortObjekts<T extends ValidObjekt>(
  filters: Filters,
  objekts: T[],
  artists: CosmoArtistWithMembersBFF[]
) {
  // default sort and season sort
  objekts = defaultSortObjekts(objekts, artists);

  const sort = filters.sort;
  const sortDir = filters.sort_dir;

  if (sort === "date") {
    if (sortDir === "desc")
      objekts = objekts.toSorted((a, b) => getSortDate(b) - getSortDate(a));
    else objekts = objekts.toSorted((a, b) => getSortDate(a) - getSortDate(b));
  } else if (sort === "season") {
    // for desc, use default
    if (sortDir === "asc")
      objekts = objekts
        .toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo))
        .toSorted((a, b) => a.season.localeCompare(b.season));
  } else if (sort === "collectionNo") {
    if (sortDir === "desc")
      objekts = objekts.toSorted((a, b) =>
        b.collectionNo.localeCompare(a.collectionNo)
      );
    else
      objekts = objekts.toSorted((a, b) =>
        a.collectionNo.localeCompare(b.collectionNo)
      );
  } else if (sort === "serial") {
    if (sortDir === "desc")
      objekts = objekts.toSorted(
        (a, b) => (b as OwnedObjekt).serial - (a as OwnedObjekt).serial
      );
    else
      objekts = objekts.toSorted(
        (a, b) => (a as OwnedObjekt).serial - (b as OwnedObjekt).serial
      );
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
  const sort = filters.sort;
  const sortDir = filters.sort_dir;

  if (sort === "duplicate") {
    if (sortDir === "desc")
      objekts = objekts.toSorted((a, b) => b.length - a.length);
    else objekts = objekts.toSorted((a, b) => a.length - b.length);
  }

  return objekts;
}

export function shapeIndexedObjekts<T extends ValidObjekt>(
  filters: Filters,
  objekts: T[],
  artists: CosmoArtistWithMembersBFF[]
): [string, T[]][] {
  objekts = filterObjekts(filters, objekts);
  objekts = sortObjekts(filters, objekts, artists);

  let results: Record<string, T[]>;
  if (filters.group_by) {
    results = groupBy(objekts, (a) =>
      filters.group_by === "seasonCollectionNo"
        ? `${a.season} ${a.collectionNo}`
        : a[filters.group_by!]
    );
  } else {
    results = groupBy(objekts, () => "");
  }

  const groupDir = filters.group_dir;

  return Object.entries(results).toSorted(([keyA], [keyB]) => {
    if (filters.group_by === "member") {
      return compareMember(keyA, keyB, groupDir, artists);
    }

    if (filters.group_by === "class") {
      return compareByArray(validClasses, keyA, keyB, groupDir);
    }

    if (groupDir === "desc") return keyB.localeCompare(keyA);
    return keyA.localeCompare(keyB);
  });
}

export function shapeProfileObjekts<T extends ValidObjekt>(
  filters: Filters,
  objekts: T[],
  artists: CosmoArtistWithMembersBFF[]
): [string, T[][]][] {
  return shapeIndexedObjekts(filters, objekts, artists).map(
    ([key, objekts]) => {
      let grouped: T[][];
      if (filters.grouped) {
        grouped = Object.values(groupBy(objekts, (a) => a.collectionId));
      } else {
        grouped = objekts.map((objekt) => [objekt]);
      }
      return [key, sortDuplicate(filters, grouped)];
    }
  );
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

  return Object.entries(grouped)
    .filter(([, objekts]) => objekts.length > 0)
    .toSorted(([, [objektA]], [, [objektB]]) =>
      groupBys.includes("class")
        ? compareByArray(validClasses, objektA.class, objektB.class, "asc")
        : 0
    )
    .toSorted(([, [objektA]], [, [objektB]]) =>
      groupBys.includes("season")
        ? compareByArray(validSeasons, objektA.season, objektB.season, "desc")
        : 0
    )
    .toSorted(([, [objektA]], [, [objektB]]) =>
      groupBys.includes("member")
        ? compareMember(objektA.member, objektB.member, "asc", artists)
        : 0
    )
    .map(([key, objekts]) => [key, defaultSortObjekts(objekts, artists)]);
}
