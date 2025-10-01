import { asc } from "drizzle-orm";
import { type ValidFourSeason, validArtists, validFourSeason } from "@/lib/universal/cosmo/common";
import { classArtistMap } from "@/lib/universal/cosmo/filter-data";
import { indexer } from "../db/indexer";
import { collections } from "../db/indexer/schema";
import { getCache } from "../redis";

export async function fetchUniqueCollections() {
  const result = await indexer
    .selectDistinct({
      collectionNo: collections.collectionNo,
    })
    .from(collections)
    .orderBy(asc(collections.collectionNo));
  return result.map((a) => a.collectionNo);
}

export async function fetchSeasonMap() {
  const result = await indexer
    .selectDistinct({
      artist: collections.artist,
      season: collections.season,
    })
    .from(collections);

  const seasonArtistMap = new Map<string, string[]>();
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

      const [, prefixA, numA] = matchA;
      const [, prefixB, numB] = matchB;

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

export async function fetchFilterData() {
  return getCache("filter-data", 60 * 60, async () => {
    const [collections, seasonsMap] = await Promise.all([
      fetchUniqueCollections(),
      fetchSeasonMap(),
    ]);
    return {
      collections,
      seasonsMap,
      classesMap: classArtistMap,
    };
  });
}
