import * as z from "zod/v4";
import type { Collection, Objekt } from "@/lib/server/db/indexer/schema";
import { replaceUrlSize } from "../utils";
import type { ParsedDate } from "./common";

export type IndexedObjekt = Omit<
  Collection,
  "contract" | "comoAmount" | "accentColor" | "thumbnailImage"
>;

export type OwnedObjekt = IndexedObjekt &
  Pick<Objekt, "mintedAt" | "receivedAt" | "serial" | "transferable">;

export type ValidObjekt = (OwnedObjekt | IndexedObjekt) & { tags?: string[] };

export type PinObjekt = {
  tokenId: string;
  order: number | null;
};

export type CollectionFormat = Pick<
  Collection,
  "slug" | "member" | "season" | "collectionNo" | "artist"
>;

export type CollectionMetadata = {
  transferable: number;
  total: number;
  spin: number;
  createdAt: string;
};

export function getCollectionShortId(objekt: ValidObjekt) {
  if (objekt.artist === "idntt") {
    return `${objekt.member} ${objekt.season} ${objekt.collectionNo}`;
  }
  const seasonNumber = Number(objekt.season.slice(-2));
  if (seasonNumber <= 1) return `${objekt.member} ${objekt.season.charAt(0)}${objekt.collectionNo}`;
  return `${objekt.member} ${objekt.season.charAt(0)}${seasonNumber} ${objekt.collectionNo}`;
}

function makeCollectionTags(objekt: ValidObjekt) {
  // todo: serial support
  const seasonCode = objekt.season.charAt(0);
  const seasonNumber = objekt.season.slice(-2);
  const seasonCodeRepeated = seasonCode.repeat(Number(seasonNumber));
  const collectionNoSliced = objekt.collectionNo.slice(0, -1);

  return [
    ...getMemberShortKeys(objekt.member),
    objekt.artist,
    objekt.collectionNo, // 201z
    `${seasonCodeRepeated}${objekt.collectionNo}`, // a201z, aa201z
    `${seasonCodeRepeated}${collectionNoSliced}`, // a201, aa201
    collectionNoSliced, // 201
    objekt.member,
    objekt.class, // special
    `${objekt.class.charAt(0)}co`, // sco
    objekt.season, // atom01
    objekt.season.slice(0, -2), // atom
    seasonCode + seasonNumber, // a01
    seasonCode + Number(seasonNumber), // a1
  ].map((a) => a.toLowerCase());
}

export function mapOwnedObjekt(objekt: Objekt, collection: IndexedObjekt): OwnedObjekt {
  return {
    ...collection,
    ...overrideCollection(collection),
    id: objekt.id.toString(),
    serial: objekt.serial,
    receivedAt: objekt.receivedAt,
    mintedAt: objekt.mintedAt,
    transferable: objekt.transferable,
  };
}

export function mapObjektWithTag(objekt: ValidObjekt): ValidObjekt {
  return {
    ...objekt,
    tags: makeCollectionTags(objekt),
  };
}

export function overrideCollection(collection: IndexedObjekt) {
  // temporary fix accent color for some collection
  const accentColor = overrideAccents[collection.slug];
  const fontColor = overrideFonts[collection.slug];

  return {
    backgroundColor: accentColor ?? collection.backgroundColor,
    textColor: fontColor ?? collection.textColor,
  };
}

export function getObjektImageUrls(objekt: ValidObjekt) {
  return {
    resizedUrl: replaceUrlSize(objekt.frontImage),
    originalUrl: replaceUrlSize(objekt.frontImage, "original"),
    backUrl: replaceUrlSize(objekt.backImage, "original"),
  };
}

const overrideAccents: Record<string, string> = {
  "divine01-seoyeon-117z": "#B400FF",
  "divine01-seoyeon-118z": "#B400FF",
  "divine01-seoyeon-119z": "#B400FF",
  "divine01-seoyeon-120z": "#B400FF",
  "divine01-seoyeon-317z": "#df2e37",
  "binary01-choerry-201z": "#FFFFFF",
  "binary01-choerry-202z": "#FFFFFF",
  "atom01-yubin-302z": "#D300BB",
  "atom01-nakyoung-302z": "#D300BB",
  "atom01-yooyeon-302z": "#D300BB",
  "atom01-hyerin-302z": "#D300BB",
};

const overrideFonts: Record<string, string> = {
  "atom01-heejin-322z": "#FFFFFF",
  "atom01-heejin-323z": "#FFFFFF",
  "atom01-heejin-324z": "#FFFFFF",
  "atom01-heejin-325z": "#FFFFFF",
  "ever01-seoyeon-338z": "#07328D",
};

// list taken from teamreflex/cosmo-web
export const unobtainables = [
  // streaming event
  "divine01-haseul-331z",
  // artms burn release celebration
  "cream01-heejin-333z",
  "cream01-haseul-333z",
  "cream01-choerry-333z",
  "cream01-jinsoul-333z",
  "cream01-kimlip-333z",
  // savior
  "binary01-savior-322z",
  // test
  "atom01-artmstest-100u",
  // error in minting
  "atom01-jinsoul-109a",
  // artms 1st anniversary events
  "atom01-heejin-346z",
  "atom01-haseul-346z",
  "atom01-kimlip-346z",
  "atom01-jinsoul-346z",
  "atom01-choerry-346z",
  // chilsung event
  "atom01-heejin-351z",
  "atom01-haseul-351z",
  "atom01-kimlip-351z",
  "atom01-jinsoul-351z",
  "atom01-choerry-351z",
  // virtual angel events
  "binary01-heejin-310z",
  "binary01-haseul-310z",
  "binary01-kimlip-310z",
  "binary01-jinsoul-310z",
  "binary01-choerry-310z",
  // lunar theory events
  "cream01-haseul-330z",
  "cream01-heejin-330z",
  "cream01-kimlip-330z",
  "cream01-jinsoul-330z",
  "cream01-choerry-330z",
  // zero class
  "atom01-triples-000z",
  "atom01-aaa-000z",
  "atom01-kre-000z",
  // error in minting
  "binary01-mayu-101a",
  "binary01-mayu-104a",
  "binary01-mayu-105a",
  "binary01-mayu-106a",
  "binary01-mayu-107a",
  "binary01-mayu-108a",
  // self-made events
  "divine01-seoyeon-312z",
  "divine01-hyerin-312z",
  "divine01-jiwoo-312z",
  "divine01-chaeyeon-312z",
  "divine01-yooyeon-312z",
  "divine01-soomin-312z",
  "divine01-nakyoung-312z",
  "divine01-yubin-312z",
  "divine01-kaede-312z",
  "divine01-dahyun-312z",
  "divine01-kotone-312z",
  "divine01-yeonji-312z",
  "divine01-nien-312z",
  "divine01-sohyun-312z",
  "divine01-xinyu-312z",
  "divine01-mayu-312z",
  "divine01-lynn-312z",
  "divine01-joobin-312z",
  "divine01-hayeon-312z",
  "divine01-shion-312z",
  "divine01-chaewon-312z",
  "divine01-sullin-312z",
  "divine01-seoah-312z",
  "divine01-jiyeon-312z",
];

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
  soda: "DaHyun",
  kwak: "YeonJi",
  yubam: "YuBin",
  ham: "SeoYeon",
  ssaem: "SoHyun",
  park: "SoHyun",
  mg: "MinGyeol",
  hh: "HwanHee",
  jh: "JuHo",
  ti: "TaeIn",
};

export function getMemberShortKeys(value: string) {
  return Object.keys(shortformMembers).filter((key) => shortformMembers[key] === value);
}

export type ObjektTransfer = {
  id: string;
  to: string;
  timestamp: ParsedDate;
  nickname?: string | null;
};

export type ObjektTransferResult = {
  hide?: boolean;
  tokenId?: number;
  owner?: string;
  transferable?: boolean;
  transfers: ObjektTransfer[];
};

export const ownedObjektCursorSchema = z
  .object({
    receivedAt: z.string().or(z.date()),
    id: z.string(),
  })
  .optional();

export type OwnedObjektsCursor = z.infer<typeof ownedObjektCursorSchema>;

export type OwnedObjektsResult = {
  nextCursor?: OwnedObjektsCursor;
  objekts: OwnedObjekt[];
};

export type CollectionResult = {
  collections: IndexedObjekt[];
};
