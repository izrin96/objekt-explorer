import type { CosmoArtistWithMembersBFF } from "@repo/cosmo/types/artists";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { groupBy } from "es-toolkit";

// Minimal type for discord formatting - only the fields we actually use
export type DiscordFormatObjekt = Pick<
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
export type FormatStyle = "default" | "compact";

export type FormatOptions = {
  showQuantity: boolean;
  lowercase: boolean;
  bullet: boolean;
  groupByMode?: GroupByMode;
  style?: FormatStyle;
};

function formatCollection(
  collection: DiscordFormatObjekt,
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
  collections: DiscordFormatObjekt[],
  showQuantity: boolean,
  groupBySeason: boolean,
  bullet: boolean,
  style: FormatStyle,
): string[] {
  const results: string[] = [];

  if (groupBySeason) {
    // group by season within member
    const seasonGroups = groupBy(collections, (a) => a.season);
    const seasonEntries = Object.entries(seasonGroups).toSorted(([a], [b]) => a.localeCompare(b));

    for (const [season, seasonCollections] of seasonEntries) {
      const formatted = Object.values(groupBy(seasonCollections, (a) => a.collectionId))
        .map((collections) => {
          const [collection] = collections;
          return collection
            ? formatCollection(collection, collections.length, showQuantity, false)
            : null;
        })
        .filter((item) => item !== null)
        .toSorted();

      if (formatted.length > 0) {
        if (style === "compact") {
          // compact: **season** collection1 collection2 (inline)
          results.push(`**${getSeasonEmoji(season)}${season}** ${formatted.join(" ")}`);
        } else {
          // default: - Season collection1 collection2
          results.push(
            `${bullet ? "- " : ""}${getSeasonEmoji(season)}${season} ${formatted.join(" ")}`,
          );
        }
      }
    }
  } else {
    // no grouping - just collections
    const formatted = Object.values(groupBy(collections, (a) => a.collectionId))
      .map((collections) => {
        const [collection] = collections;
        return collection
          ? formatCollection(collection, collections.length, showQuantity, true)
          : null;
      })
      .filter((item) => item !== null)
      .toSorted();

    results.push(...formatted);
  }

  return results;
}

export function format(collectionMap: Map<string, DiscordFormatObjekt[]>, options: FormatOptions) {
  const { showQuantity, lowercase, bullet, groupByMode = "none", style = "default" } = options;

  if (groupByMode === "season-first") {
    // group by season first, then by member
    const allCollections: DiscordFormatObjekt[] = [];
    for (const collections of collectionMap.values()) {
      allCollections.push(...collections);
    }

    const seasonGroups = groupBy(allCollections, (a) => a.season);
    const seasonEntries = Object.entries(seasonGroups).toSorted(([a], [b]) => a.localeCompare(b));

    const results: string[] = [];

    for (const [season, seasonCollections] of seasonEntries) {
      // group by member within this season
      const memberGroups = groupBy(seasonCollections, (a) => a.member);
      const memberEntries = Object.entries(memberGroups).toSorted(([a], [b]) => a.localeCompare(b));

      if (style === "compact") {
        // compact style: - __season__ **member1** collection1 **member2** collection2 (inline)
        const memberParts: string[] = [];
        for (const [member, memberCollections] of memberEntries) {
          const formatted = Object.values(groupBy(memberCollections, (a) => a.collectionId))
            .map((collections) => {
              const [collection] = collections;
              return collection
                ? formatCollection(collection, collections.length, showQuantity, false)
                : null;
            })
            .filter((item) => item !== null)
            .toSorted();

          if (formatted.length > 0) {
            memberParts.push(`**${member}** ${formatted.join(" ")}`);
          }
        }

        if (memberParts.length > 0) {
          results.push(
            `${bullet ? "- " : ""}__${getSeasonEmoji(season)}${season}__ ${memberParts.join(" ")}`,
          );
        }
      } else {
        // default style: **season**\n- member collection1 collection2
        const memberLines: string[] = [];
        for (const [member, memberCollections] of memberEntries) {
          const formatted = Object.values(groupBy(memberCollections, (a) => a.collectionId))
            .map((collections) => {
              const [collection] = collections;
              return collection
                ? formatCollection(collection, collections.length, showQuantity, false)
                : null;
            })
            .filter((item) => item !== null)
            .toSorted();

          if (formatted.length > 0) {
            memberLines.push(`${bullet ? "- " : ""}${member} ${formatted.join(" ")}`);
          }
        }

        if (memberLines.length > 0) {
          results.push(`**${getSeasonEmoji(season)}${season}**`);
          results.push(...memberLines);
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
        style,
      );

      if (formatted.length === 0) {
        return "";
      }

      if (groupByMode === "season") {
        if (style === "compact") {
          // compact: - __member__ **season** collection1 collection2 (inline)
          return `${bullet ? "- " : ""}__${member}__ ${formatted.join(" ")}`;
        }
        // default: **member**\n- season collectionNo
        return `**${member}**\n${formatted.join("\n")}`;
      }

      // format: - member collectionNo (same for both default and compact)
      return `${bullet ? "- " : ""}${member} ${formatted.join(" ")}`;
    })
    .filter((line) => line !== "");

  const output = lines.join("\n");
  return lowercase ? output.toLowerCase() : output;
}

export function mapByMember(
  entries: DiscordFormatObjekt[],
  members: string[],
): Map<string, DiscordFormatObjekt[]> {
  const output = new Map<string, DiscordFormatObjekt[]>();
  for (const member of members) {
    for (const collectionEntry of entries.filter((a) => a.member === member)) {
      output.set(member, [...(output.get(member) ?? []), collectionEntry]);
    }
  }

  return output;
}

export function makeMemberOrderedList(
  entries: DiscordFormatObjekt[],
  artists: CosmoArtistWithMembersBFF[],
) {
  const artistsMembers = artists.flatMap((a) => a.artistMembers);

  // get ordered member list from collection
  const members = Object.values(groupBy(entries, (a) => `${a.artist}-${a.member}`))
    .toSorted(([a], [b]) => {
      // order by member
      const posA = artistsMembers.findIndex((p) => p.name === a?.member);
      const posB = artistsMembers.findIndex((p) => p.name === b?.member);

      return posA - posB;
    })
    .toSorted(([a], [b]) => {
      // order by artist
      const posA = artists.findIndex((p) => p.name === a?.artist);
      const posB = artists.findIndex((p) => p.name === b?.artist);

      return posA - posB;
    })
    .map(([a]) => a!.member);

  return members;
}
