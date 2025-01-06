import { Filters } from "@/hooks/use-filters";
import { ValidClass, ValidSeason } from "@/lib/universal/cosmo/common";
import {
  getSeasonCollectionNo,
  IndexedObjekt,
  ValidObjekt,
} from "./universal/objekts";
import { OwnedObjekt } from "./universal/cosmo/objekts";
import { groupBy, prop } from "remeda";

const shortformMembers: Record<string, string> = {
  naky: "NaKyoung",
  tone: "Kotone",
  sulin: "Sullin",
  choery: "Choerry",
  sy: "SeoYeon",
  yy: "YooYeon",
  jb: "JooBin",
  dh: "DaHyun",
  kd: "Kaede",
  hr: "HyeRin",
  jw: "JiWoo",
  cy: "ChaeYeon",
  sm: "SooMin",
  nk: "NaKyoung",
  yb: "YuBin",
  k: "Kaede",
  yj: "YeonJi",
  n: "Nien",
  sh: "SoHyun",
  x: "Xinyu",
  m: "Mayu",
  l: "Lynn",
  hy: "HaYeon",
  so: "ShiOn",
  cw: "ChaeWon",
  s: "Sullin",
  sa: "SeoAh",
  jy: "JiYeon",
  hj: "HeeJin",
  hs: "HaSeul",
  kl: "KimLip",
  js: "JinSoul",
  c: "Choerry",
};

function getMemberShortKeys(value: string) {
  return Object.keys(shortformMembers).filter(
    (key) => shortformMembers[key] === value
  );
}

const searchFilter = (search: string, objekt: ValidObjekt) => {
  const searchLower = search.toLowerCase();
  const keys = [...getMemberShortKeys(objekt.member), objekt.member];
  return (
    keys.some((key) =>
      `${key} ${objekt.collectionNo}`.toLowerCase().includes(searchLower)
    ) ||
    keys.some((key) =>
      `${key} ${getSeasonCollectionNo(objekt)}`
        .toLowerCase()
        .includes(searchLower)
    )
  );
};

// todo: refactor and optimize this filtering

export function filterObjektsIndexed(
  filters: Filters,
  objekts: IndexedObjekt[]
) {
  if (filters.member) {
    objekts = objekts.filter((a) => filters.member?.includes(a.member));
  }
  if (filters.artist) {
    objekts = objekts.filter((a) => a.artist === filters.artist);
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

  if (filters.search) {
    // support multiple query split by commas
    const searches = filters.search
      .split(",")
      .filter(Boolean)
      .map((a) => a.trim());
    objekts = objekts.filter((objekt) =>
      searches.some((s) => searchFilter(s, objekt))
    );
  }

  // sort by noDescending first
  objekts = objekts.toSorted((a, b) =>
    b.collectionNo.localeCompare(a.collectionNo)
  );

  const sort = filters.sort ?? "newest";
  switch (sort) {
    case "newest":
      objekts = objekts.toSorted(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
    case "oldest":
      objekts = objekts.toSorted(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      break;
    case "noDescending":
      objekts = objekts.toSorted((a, b) =>
        b.collectionNo.localeCompare(a.collectionNo)
      );
      break;
    case "noAscending":
      objekts = objekts.toSorted((a, b) =>
        a.collectionNo.localeCompare(b.collectionNo)
      );
      break;
    case "newestSeason":
      objekts = objekts
        .toSorted((a, b) => b.collectionNo.localeCompare(a.collectionNo))
        .toSorted((a, b) => b.season.localeCompare(a.season));
      break;
    case "oldestSeason":
      objekts = objekts
        .toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo))
        .toSorted((a, b) => a.season.localeCompare(b.season));
      break;
  }

  return objekts;
}

function filterObjektsOwned(filters: Filters, objekts: OwnedObjekt[]) {
  if (filters.member) {
    objekts = objekts.filter((a) => filters.member?.includes(a.member));
  }
  if (filters.artist) {
    objekts = objekts.filter((a) =>
      a.artists.includes(filters.artist ?? "tripleS")
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
    objekts = objekts.filter(
      (a) =>
        (filters.on_offline?.includes("online")
          ? a.collectionNo.includes("Z")
          : false) ||
        (filters.on_offline?.includes("offline")
          ? a.collectionNo.includes("A")
          : false)
    );
  }
  if (filters.transferable) {
    objekts = objekts.filter((a) => a.transferable === true);
  }
  if (filters.gridable) {
    objekts = objekts.filter(
      (a) => a.usedForGrid === false && a.class === "First"
    );
  }

  if (filters.search) {
    // support multiple query split by commas
    const searches = filters.search
      .split(",")
      .filter(Boolean)
      .map((a) => a.trim());
    objekts = objekts.filter((objekt) =>
      searches.some((s) => searchFilter(s, objekt))
    );
  }

  // sort by noDescending first
  objekts = objekts.toSorted((a, b) =>
    b.collectionNo.localeCompare(a.collectionNo)
  );

  const sort = filters.sort ?? "newest";
  switch (sort) {
    case "newest":
      objekts = objekts.toSorted(
        (a, b) =>
          new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      );
      break;
    case "oldest":
      objekts = objekts.toSorted(
        (a, b) =>
          new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
      );
      break;
    case "noDescending":
      objekts = objekts.toSorted((a, b) =>
        b.collectionNo.localeCompare(a.collectionNo)
      );
      break;
    case "noAscending":
      objekts = objekts.toSorted((a, b) =>
        a.collectionNo.localeCompare(b.collectionNo)
      );
      break;
    case "serialDesc":
      objekts = objekts.toSorted((a, b) => b.objektNo - a.objektNo);
      break;
    case "serialAsc":
      objekts = objekts.toSorted((a, b) => a.objektNo - b.objektNo);
      break;
    case "newestSeason":
      objekts = objekts
        .toSorted((a, b) => b.collectionNo.localeCompare(a.collectionNo))
        .toSorted((a, b) => b.season.localeCompare(a.season));
      break;
    case "oldestSeason":
      objekts = objekts
        .toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo))
        .toSorted((a, b) => a.season.localeCompare(b.season));
      break;
  }

  return objekts;
}

function filterGroupedObjektsOwned(filters: Filters, objekts: OwnedObjekt[][]) {
  const sort = filters.sort ?? "newest";
  switch (sort) {
    case "duplicateDesc":
      objekts = objekts.toSorted((a, b) => b.length - a.length);
      break;
    case "duplicateAsc":
      objekts = objekts.toSorted((a, b) => a.length - b.length);
      break;
  }
  return objekts;
}

export function filterAndGroupObjektsOwned(
  filters: Filters,
  objekts: OwnedObjekt[]
) {
  objekts = filterObjektsOwned(filters, objekts);
  let groupedObjekts: OwnedObjekt[][];
  if (filters.grouped) {
    groupedObjekts = Object.values(groupBy(objekts, prop("collectionId")));
  } else {
    groupedObjekts = objekts.map((objekt) => [objekt]);
  }
  return filterGroupedObjektsOwned(filters, groupedObjekts);
}
