import type { ValidArtist, ValidFourSeason } from "@repo/cosmo/types/common";
import { validArtists, validFourSeason } from "@repo/cosmo/types/common";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { asc, count, countDistinct, eq, inArray } from "drizzle-orm";

import { getStaleCache } from "../redis";

const classOrder: Record<ValidArtist, string[]> = {
  tripleS: ["First", "Double", "Motion", "Unit", "Special", "Premier", "Welcome", "Zero"],
  artms: ["First", "Double", "Motion", "Unit", "Special", "Premier", "Welcome", "Zero"],
  idntt: ["Basic", "Event", "Motion", "Special", "Unit", "Welcome"],
};

async function fetchUniqueCollections() {
  const result = await indexer
    .selectDistinct({
      collectionNo: collections.collectionNo,
    })
    .from(collections)
    .orderBy(asc(collections.collectionNo));
  return result.map((a) => a.collectionNo);
}

async function fetchSeasonMap() {
  const result = await indexer
    .selectDistinct({
      artist: collections.artist,
      season: collections.season,
    })
    .from(collections);

  const seasonArtistMap = new Map<ValidArtist, string[]>();
  for (const artist of validArtists) {
    const items = result.filter((a) => a.artist === artist.toLowerCase());
    for (const item of items) {
      const artistMap = seasonArtistMap.get(artist);
      if (!artistMap) {
        seasonArtistMap.set(artist, [item.season]);
      } else {
        artistMap.push(item.season);
      }
    }
  }

  return Array.from(seasonArtistMap.entries()).map(([artistId, seasons]) => {
    seasons.sort((a, b) => {
      const matchA = a.match(/^([a-zA-Z]+)(\d+)$/);
      const matchB = b.match(/^([a-zA-Z]+)(\d+)$/);

      if (!matchA || !matchB) {
        return a.localeCompare(b);
      }

      const [, prefixA = "", numA = ""] = matchA;
      const [, prefixB = "", numB = ""] = matchB;

      const numCompare = parseInt(numA) - parseInt(numB);
      if (numCompare !== 0) {
        return numCompare;
      }

      if (artistId === "idntt") {
        const seasonIndexA = validFourSeason.indexOf(prefixA as ValidFourSeason);
        const seasonIndexB = validFourSeason.indexOf(prefixB as ValidFourSeason);
        return seasonIndexA - seasonIndexB;
      }

      return prefixA.localeCompare(prefixB);
    });

    return {
      artistId,
      seasons,
    };
  });
}

async function fetchClassMap() {
  const result = await indexer
    .selectDistinct({
      artist: collections.artist,
      class: collections.class,
    })
    .from(collections);

  const classArtistMap = new Map<ValidArtist, string[]>();
  for (const artist of validArtists) {
    const items = result.filter((a) => a.artist === artist.toLowerCase());
    for (const item of items) {
      const classMap = classArtistMap.get(artist);
      if (!classMap) {
        classArtistMap.set(artist, [item.class]);
      } else {
        classMap.push(item.class);
      }
    }
  }

  return Array.from(classArtistMap.entries()).map(([artistId, classes]) => ({
    artistId,
    classes: classes.toSorted(
      (a, b) => classOrder[artistId].indexOf(a) - classOrder[artistId].indexOf(b),
    ),
  }));
}

/** The root loader awaits this on every page, so an indexer outage serves the stored copy. */
export async function fetchFilterData() {
  return getStaleCache("filter-data", 60 * 60, async () => {
    const [collections, seasonsMap, classesMap] = await Promise.all([
      fetchUniqueCollections(),
      fetchSeasonMap(),
      fetchClassMap(),
    ]);
    return {
      collections,
      seasonsMap,
      classesMap,
    };
  });
}

/** Each owner's objekt count, as the profile's grid counts them, keyed by lowercased address. */
export async function fetchOwnerCounts(addresses: string[]) {
  if (addresses.length === 0) return new Map<string, number>();
  const rows = await indexer
    .select({ owner: objekts.owner, count: count() })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(
      inArray(
        objekts.owner,
        addresses.map((address) => address.toLowerCase()),
      ),
    )
    .groupBy(objekts.owner);
  return new Map(rows.map((row) => [row.owner, row.count]));
}

/** One owner's objekt and collection counts, as the profile header counts them. */
export async function fetchOwnerSummary(address: string) {
  const [row] = await indexer
    .select({ objekts: count(), collections: countDistinct(collections.collectionId) })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(eq(objekts.owner, address.toLowerCase()));
  return { objekts: row?.objekts ?? 0, collections: row?.collections ?? 0 };
}
