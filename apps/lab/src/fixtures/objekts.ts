/**
 * Real collections, pulled from `https://objekt.top/api/collection` by
 * `scripts/fetch-collections.ts` into `collections.json` (180 rows: the 40
 * newest per artist plus coverage of every season and class).
 *
 * A `LabObjekt` is a collection row. Token-level fields (`serial`,
 * `transferable`, `receivedAt`) are only set on the owned fixtures a profile
 * generates — Home / Market / Activity / Lists show collections, so they
 * leave them undefined and the drawer opens in collection mode.
 */
import collections from "@/fixtures/collections.json";

export type LabArtist = "tripleS" | "ARTMS" | "idntt";

/** the API stores artists lowercase; the UI shows the branded casing */
const ARTIST_LABEL: Record<string, LabArtist> = {
  triples: "tripleS",
  artms: "ARTMS",
  idntt: "idntt",
};

export type LabCollection = {
  slug: string;
  collectionId: string;
  season: string;
  member: string;
  artist: string;
  collectionNo: string;
  class: string;
  thumbnailImage: string;
  frontImage: string;
  backImage: string;
  backgroundColor: string;
  textColor: string;
  onOffline: string;
  createdAt: string;
};

export type LabObjekt = {
  /** collection slug, or `slug#serial` once a serial is attached */
  id: string;
  slug: string;
  collectionId: string;
  member: string;
  artist: LabArtist;
  season: string;
  class: string;
  collectionNo: string;
  backgroundColor: string;
  textColor: string;
  onOffline: "online" | "offline";
  thumbnailImage: string;
  frontImage: string;
  /** empty string on collections Cosmo never published a back for */
  backImage: string;
  createdAt: string;
  /** token-level, only on owned fixtures */
  serial?: number;
  transferable?: boolean;
  receivedAt?: Date;
};

function toObjekt(row: LabCollection): LabObjekt {
  return {
    id: row.slug,
    slug: row.slug,
    collectionId: row.collectionId,
    member: row.member,
    artist: ARTIST_LABEL[row.artist] ?? "tripleS",
    season: row.season,
    class: row.class,
    collectionNo: row.collectionNo,
    backgroundColor: row.backgroundColor,
    textColor: row.textColor,
    onOffline: row.onOffline === "offline" ? "offline" : "online",
    thumbnailImage: row.thumbnailImage,
    frontImage: row.frontImage,
    backImage: row.backImage,
    createdAt: row.createdAt,
  };
}

export const objekts: LabObjekt[] = (collections as LabCollection[]).map(toObjekt);

/** slug lookup, for the surfaces that store objekt ids rather than rows (lists) */
export const objektById: ReadonlyMap<string, LabObjekt> = new Map(
  objekts.map((objekt) => [objekt.id, objekt]),
);

/**
 * Attach token-level fields to a collection row. Used by the profile fixtures
 * so an owned card carries a serial and the drawer opens in owned mode, and by
 * Activity, whose rows name a token but hold no date the owner received it —
 * hence the optional `receivedAt`.
 */
export function ownedObjekt(
  collection: LabObjekt,
  serial: number,
  transferable: boolean,
  receivedAt?: Date,
): LabObjekt {
  return {
    id: `${collection.slug}#${serial}`,
    slug: collection.slug,
    collectionId: collection.collectionId,
    member: collection.member,
    artist: collection.artist,
    season: collection.season,
    class: collection.class,
    collectionNo: collection.collectionNo,
    backgroundColor: collection.backgroundColor,
    textColor: collection.textColor,
    onOffline: collection.onOffline,
    thumbnailImage: collection.thumbnailImage,
    frontImage: collection.frontImage,
    backImage: collection.backImage,
    createdAt: collection.createdAt,
    serial,
    transferable,
    receivedAt,
  };
}
