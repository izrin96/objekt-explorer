import type { OwnedObjekt, ValidObjekt } from "@repo/lib/types/objekt";

import { getCollectionEdition } from "./universal/collection-grid";

function getMemberShortKeys(value: string) {
  return Object.keys(shortformMembers).filter((key) => shortformMembers[key] === value);
}

const seasonShortNames: Record<string, string> = {
  spring: "Sp",
  summer: "Su",
  autumn: "A",
  winter: "W",
};

export function getCollectionShortId(objekt: ValidObjekt) {
  if (objekt.artist === "idntt") {
    const prefix = objekt.season.slice(0, -2).toLowerCase();
    const shortName = seasonShortNames[prefix] ?? objekt.season.slice(0, -2);
    const year = objekt.season.slice(-2);
    return `${objekt.member} ${shortName}${year} ${objekt.collectionNo}`;
  }
  const seasonNumber = Number(objekt.season.slice(-2));
  if (seasonNumber < 2) return `${objekt.member} ${objekt.season.charAt(0)}${objekt.collectionNo}`;
  return `${objekt.member} ${objekt.season.charAt(0)}${seasonNumber} ${objekt.collectionNo}`;
}

function makeCollectionTags(objekt: ValidObjekt) {
  const seasonCode = objekt.season.charAt(0);
  const seasonNumber = objekt.season.slice(-2);
  const seasonInt = Number(seasonNumber);
  const seasonCodeRepeat = seasonCode.repeat(seasonInt);
  const collectionNoSlice = objekt.collectionNo.slice(0, -1);
  const season = objekt.season.slice(0, -2);

  const tags = [
    ...getMemberShortKeys(objekt.member),
    objekt.artist,
    objekt.collectionNo, // 201z
    ...(objekt.artist === "idntt"
      ? []
      : [
          `${seasonCodeRepeat}${objekt.collectionNo}`, // a201z, aa201z
          `${seasonCodeRepeat}${collectionNoSlice}`, // a201, aa201
        ]),
    collectionNoSlice, // 201
    objekt.member,
    objekt.class, // special
    `${objekt.class.charAt(0)}co`, // sco
    objekt.season, // atom01
    season, // atom
    season + seasonInt, // atom1
    seasonCode + seasonNumber, // a01
    seasonCode + seasonInt, // a1
  ];

  // For combined members ("S8 X S12"), also index individual names
  if (objekt.member.toLowerCase().includes(" x ")) {
    const parts = objekt.member.split(" X ");
    tags.push(...parts);
    tags.push(parts.join("x"));
  }

  return tags.map((t) => t.toLowerCase());
}

export function mapObjektWithTag<T extends ValidObjekt>(objekt: T): T {
  return {
    ...objekt,
    tags: makeCollectionTags(objekt),
    edition: getCollectionEdition(objekt),
  };
}

export function isObjektOwned(objekt: ValidObjekt): objekt is OwnedObjekt {
  return "serial" in objekt;
}

// Member shortform aliases
const shortformMembers: Record<string, string> = {
  // triples
  sy: "SeoYeon",
  ham: "SeoYeon",
  hr: "HyeRin",
  jw: "JiWoo",
  cy: "ChaeYeon",
  yy: "YooYeon",
  sm: "SooMin",
  nk: "NaKyoung",
  naky: "NaKyoung",
  yb: "YuBin",
  yubam: "YuBin",
  k: "Kaede",
  kd: "Kaede",
  dh: "DaHyun",
  soda: "DaHyun",
  ktn: "Kotone",
  tone: "Kotone",
  yj: "YeonJi",
  kwak: "YeonJi",
  n: "Nien",
  ni: "Nien",
  sh: "SoHyun",
  ssaem: "SoHyun",
  park: "SoHyun",
  x: "Xinyu",
  xn: "Xinyu",
  m: "Mayu",
  my: "Mayu",
  l: "Lynn",
  ln: "Lynn",
  jb: "JooBin",
  jbn: "JooBin",
  hy: "HaYeon",
  so: "ShiOn",
  sion: "ShiOn",
  cw: "ChaeWon",
  s: "Sullin",
  sl: "Sullin",
  sulin: "Sullin",
  sa: "SeoAh",
  jy: "JiYeon",

  // artms
  hj: "HeeJin",
  hs: "HaSeul",
  kl: "KimLip",
  js: "JinSoul",
  c: "Choerry",
  ch: "Choerry",
  choery: "Choerry",

  // idntt
  dhn: "DoHun",
  heju: "HeeJu",
  mg: "MinGyeol",
  ti: "TaeIn",
  jae: "JaeYoung",
  jyg: "JaeYoung",
  jyoung: "JaeYoung",
  jh: "JuHo",
  jwn: "JiWoon",
  jiwon: "JiWoon",
  hh: "HwanHee",
  cm: "CheongMyeong",
  t: "Towa",
  tw: "Towa",
  kh: "KyuHyuk",
  nr: "NuRi",
  sj: "SeongJun",
  yjn: "YeJoon",
  yejon: "YeJoon",
  gb: "GyeongBeen",
  es: "EunSoo",
  gw: "GiWoong",
  jhn: "JooHeon",
  joheon: "JooHeon",
  gh: "GyungHo",
  ec: "EunChan",
  esg: "EunSung",
};
