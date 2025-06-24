import { groupBy } from "es-toolkit";
import { CollectionFormat } from "./universal/objekts";
import { CosmoArtistWithMembersBFF } from "./universal/cosmo/artists";

export function format(
  collectionMap: Map<string, CollectionFormat[]>,
  showQuantity: boolean,
  lowercase: boolean
) {
  return Array.from(collectionMap.entries()).map(([member, collections]) => {
    const formatCollections = collections.map((collection) => {
      if (collection.artist === "idntt") {
        return `${collection.season} ${collection.collectionNo}`;
      }
      const seasonCode = collection.season.charAt(0);
      const seasonNumber = collection.season.slice(-2);
      const seasonFormat = seasonCode.repeat(parseInt(seasonNumber));

      return `${seasonFormat}${collection.collectionNo}`;
    });

    const groupedFormat = groupBy(formatCollections, (a) => a);

    const formattedWithQuantity = Object.entries(groupedFormat)
      .map(([key, group]) =>
        showQuantity && group.length > 1 ? `${key} (x${group.length})` : key
      )
      .sort();

    const output = `${member} ${formattedWithQuantity.join(" ")}`;
    return lowercase ? output.toLowerCase() : output;
  });
}

export function mapCollectionByMember(
  collectionMap: Map<string, CollectionFormat>,
  entries: string[],
  members: string[]
): Map<string, CollectionFormat[]> {
  const output = new Map<string, CollectionFormat[]>();
  const collectionEntries = entries
    .map((slug) => collectionMap.get(slug))
    .filter((a) => a !== undefined);
  for (const member of members) {
    for (const collectionEntry of collectionEntries.filter(
      (a) => a.member === member
    )) {
      output.set(member, [...(output.get(member) ?? []), collectionEntry]);
    }
  }

  return output;
}

export function mapByMember(
  entries: CollectionFormat[],
  members: string[]
): Map<string, CollectionFormat[]> {
  const output = new Map<string, CollectionFormat[]>();
  for (const member of members) {
    for (const collectionEntry of entries.filter((a) => a.member === member)) {
      output.set(member, [...(output.get(member) ?? []), collectionEntry]);
    }
  }

  return output;
}

export function makeMemberOrderedList(
  entries: CollectionFormat[],
  artists: CosmoArtistWithMembersBFF[]
) {
  const artistsMembers = artists.flatMap((a) => a.artistMembers);

  // get ordered member list from collection
  const members = Object.values(
    groupBy(entries, (a) => `${a.artist}-${a.member}`)
  )
    .toSorted(([a], [b]) => {
      // order by member
      const posA = artistsMembers.findIndex((p) => p.name === a.member);
      const posB = artistsMembers.findIndex((p) => p.name === b.member);

      return posA - posB;
    })
    .toSorted(([a], [b]) => {
      // order by artist
      const posA = artists.findIndex((p) => p.name === a.artist);
      const posB = artists.findIndex((p) => p.name === b.artist);

      return posA - posB;
    })
    .map(([a]) => a.member);

  return members;
}
