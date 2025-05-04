import type { Collection, Objekt } from "@/lib/server/db/indexer/schema";

export type IndexedObjekt = { id: string | number } & Omit<
  Collection,
  "id" | "contract" | "comoAmount" | "accentColor" | "thumbnailImage"
>;

export type OwnedObjekt = IndexedObjekt &
  Pick<Objekt, "mintedAt" | "receivedAt" | "serial" | "transferable">;

export type ValidObjekt = OwnedObjekt | IndexedObjekt;

export function getCollectionShortId(objekt: ValidObjekt) {
  return `${objekt.member} ${objekt.season.charAt(0)}${parseInt(
    objekt.season.slice(-2)
  )} ${objekt.collectionNo}`;
}

export function mapOwnedObjekt(objekt: Objekt, collection: IndexedObjekt) {
  return {
    ...collection,
    ...overrideColor(collection),
    id: objekt.id,
    serial: objekt.serial,
    receivedAt: objekt.receivedAt,
    mintedAt: objekt.mintedAt,
    transferable: objekt.transferable,
  } satisfies OwnedObjekt;
}

// temporary fix accent color for some collection
export function overrideColor(objekt: ValidObjekt) {
  const accentColor = overrideAccents[objekt.slug];
  const fontColor = overrideFonts[objekt.slug];

  return {
    backgroundColor: accentColor ?? objekt.backgroundColor,
    textColor: fontColor ?? objekt.textColor,
  };
}

export const overrideAccents: Record<string, string> = {
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

export const overrideFonts: Record<string, string> = {
  "atom01-heejin-322z": "#FFFFFF",
  "atom01-heejin-323z": "#FFFFFF",
  "atom01-heejin-324z": "#FFFFFF",
  "atom01-heejin-325z": "#FFFFFF",
  "ever01-seoyeon-338z": "#07328D",
};

// list taken from teamreflex/cosmo-web
export const unobtainables = [
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
