import { groupBy } from "es-toolkit";
import type { CosmoArtistWithMembersBFF } from "./universal/cosmo/artists";
import type { ValidObjekt } from "./universal/objekts";

export type FormatObjekt = Pick<
  ValidObjekt,
  "slug" | "season" | "collectionNo" | "member" | "artist" | "collectionId" | "class"
>;

export function getSeasonEmoji(season: string) {
  if (season.startsWith("Spring")) {
    return "🌸";
  }
  if (season.startsWith("Summer")) {
    return "☀️";
  }
  if (season.startsWith("Autumn")) {
    return "🍁";
  }
  if (season.startsWith("Winter")) {
    return "❄️";
  }
  return "";
}

export type GroupByMode = "none" | "season" | "season-first";

function formatCollection(
  collection: FormatObjekt,
  quantity: number,
  showQuantity: boolean,
  showSeason: boolean,
): string {
  let text = "";

  if (collection.artist === "idntt") {
    text = `${showSeason ? getSeasonEmoji(collection.season) : ""}${collection.collectionNo}`;
  } else {
    const seasonCode = collection.season.charAt(0);
    const seasonNumber = collection.season.slice(-2);
    const seasonFormat = seasonCode.repeat(Number(seasonNumber));
    text = `${seasonFormat}${collection.collectionNo}`;
  }

  return `${text}${showQuantity && quantity > 1 ? ` (x${quantity})` : ""}`;
}

function formatMemberCollections(
  collections: FormatObjekt[],
  showQuantity: boolean,
  groupBySeason: boolean,
  bullet: boolean,
): string[] {
  const results: string[] = [];

  if (groupBySeason) {
    // group by season within member
    const seasonGroups = groupBy(collections, (a) => a.season);
    const seasonEntries = Object.entries(seasonGroups).sort(([a], [b]) => a.localeCompare(b));

    for (const [season, seasonCollections] of seasonEntries) {
      const formatted = Object.values(groupBy(seasonCollections, (a) => a.collectionId))
        .map((collections) => {
          const [collection] = collections;
          return formatCollection(collection, collections.length, showQuantity, false);
        })
        .sort();

      if (formatted.length > 0) {
        // Format: - Season collection1 collection2
        results.push(
          `${bullet ? "- " : ""}${getSeasonEmoji(season)}${season} ${formatted.join(" ")}`,
        );
      }
    }
  } else {
    // no grouping - just collections
    const formatted = Object.values(groupBy(collections, (a) => a.collectionId))
      .map((collections) => {
        const [collection] = collections;
        return formatCollection(collection, collections.length, showQuantity, true);
      })
      .sort();

    results.push(...formatted);
  }

  return results;
}

export function format(
  collectionMap: Map<string, FormatObjekt[]>,
  showQuantity: boolean,
  lowercase: boolean,
  bullet: boolean,
  groupByMode: GroupByMode = "none",
) {
  if (groupByMode === "season-first") {
    // group by season first, then by member
    const allCollections: FormatObjekt[] = [];
    for (const collections of collectionMap.values()) {
      allCollections.push(...collections);
    }

    const seasonGroups = groupBy(allCollections, (a) => a.season);
    const seasonEntries = Object.entries(seasonGroups).sort(([a], [b]) => a.localeCompare(b));

    const results: string[] = [];

    for (const [season, seasonCollections] of seasonEntries) {
      results.push(`**${getSeasonEmoji(season)}${season}**`);

      // group by member within this season
      const memberGroups = groupBy(seasonCollections, (a) => a.member);
      const memberEntries = Object.entries(memberGroups).sort(([a], [b]) => a.localeCompare(b));

      for (const [member, memberCollections] of memberEntries) {
        const formatted = Object.values(groupBy(memberCollections, (a) => a.collectionId))
          .map((collections) => {
            const [collection] = collections;
            return formatCollection(collection, collections.length, showQuantity, false);
          })
          .sort();

        if (formatted.length > 0) {
          results.push(`${bullet ? "- " : ""}${member} ${formatted.join(" ")}`);
        }
      }
    }

    const output = results.join("\n");
    return lowercase ? output.toLowerCase() : output;
  }

  // default: group by member first
  const lines = Array.from(collectionMap.entries())
    .map(([member, collections]) => {
      const formatted = formatMemberCollections(
        collections,
        showQuantity,
        groupByMode === "season",
        bullet,
      );

      if (formatted.length === 0) {
        return "";
      }

      if (groupByMode === "season") {
        // format: **member**\n- season collectionNo
        return `**${member}**\n${formatted.join("\n")}`;
      }

      // format: - member collectionNo
      return `${bullet ? "- " : ""}${member} ${formatted.join(" ")}`;
    })
    .filter((line) => line !== "");

  const output = lines.join("\n");
  return lowercase ? output.toLowerCase() : output;
}

export function mapCollectionByMember(
  collectionMap: Map<string, FormatObjekt>,
  entries: string[],
  members: string[],
): Map<string, FormatObjekt[]> {
  const output = new Map<string, FormatObjekt[]>();
  const collectionEntries = entries
    .map((slug) => collectionMap.get(slug))
    .filter((a) => a !== undefined);
  for (const member of members) {
    for (const collectionEntry of collectionEntries.filter((a) => a.member === member)) {
      output.set(member, [...(output.get(member) ?? []), collectionEntry]);
    }
  }

  return output;
}

export function mapByMember(
  entries: FormatObjekt[],
  members: string[],
): Map<string, FormatObjekt[]> {
  const output = new Map<string, FormatObjekt[]>();
  for (const member of members) {
    for (const collectionEntry of entries.filter((a) => a.member === member)) {
      output.set(member, [...(output.get(member) ?? []), collectionEntry]);
    }
  }

  return output;
}

export function makeMemberOrderedList(
  entries: FormatObjekt[],
  artists: CosmoArtistWithMembersBFF[],
) {
  const artistsMembers = artists.flatMap((a) => a.artistMembers);

  // get ordered member list from collection
  const members = Object.values(groupBy(entries, (a) => `${a.artist}-${a.member}`))
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
