import type { ValidEdition } from "@repo/cosmo/types/common";
import type { Collection, Objekt } from "@repo/db/indexer/schema";

type CollectionExtra = {
  tags?: string[];
  edition?: ValidEdition | null;
};

export type IndexedObjekt = Omit<
  Collection,
  "contract" | "comoAmount" | "accentColor" | "thumbnailImage"
> &
  CollectionExtra;

export type OwnedObjekt = IndexedObjekt &
  Pick<Objekt, "mintedAt" | "receivedAt" | "serial" | "transferable"> &
  OwnedExtra;

type OwnedExtra = {
  isPin?: boolean;
  isLocked?: boolean;
  pinOrder?: number | null;
};

export type ValidObjekt = OwnedObjekt | IndexedObjekt;

export type PinObjekt = {
  tokenId: string;
  order: number | null;
};

export type CollectionMetadata = {
  transferable: number;
  total: number;
  spin: number;
  createdAt: string;
};

export const shortformMembers: Record<string, string> = {
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

export type ObjektTransfer = {
  id: string;
  to: string;
  timestamp: string;
  nickname?: string | null;
};

export type ObjektTransferResult = {
  hide?: boolean;
  tokenId?: string;
  owner?: string;
  transferable?: boolean;
  transfers: ObjektTransfer[];
};

export type OwnedObjektsResult = {
  nextCursor?: {
    receivedAt: string | Date;
    id: string;
  };
  objekts: OwnedObjekt[];
};

export type CollectionResult = {
  collections: IndexedObjekt[];
};
