import type {
  Collection as _Collection,
  Objekt as _Objekt,
  Transfer as _Transfer,
  Vote as _Vote,
  ComoBalance as _ComoBalance,
} from "./schema";

/**
 * Convert all Date field to string
 */
export type Collection = Omit<_Collection, "createdAt"> & { createdAt: string };
export type Objekt = Omit<_Objekt, "mintedAt" | "receivedAt"> & {
  mintedAt: string;
  receivedAt: string;
};
export type Transfer = Omit<_Transfer, "timestamp"> & { timestamp: string };
export type Vote = Omit<_Vote, "createdAt"> & { createdAt: string };
export type ComoBalance = _ComoBalance;
