import type { ValidObjekt } from "@repo/lib/types/objekt";
import { groupBy } from "es-toolkit/array";

// Minimal type for discord formatting - only the fields we actually use
export type DiscordFormatObjekt = Pick<
  ValidObjekt,
  "slug" | "season" | "collectionNo" | "member" | "artist" | "collectionId" | "class"
>;

const SEASON_EMOJIS: Record<string, string> = {
  Spring: "🌸",
  Summer: "☀️",
  Autumn: "🍁",
  Winter: "❄️",
};

export const MEMBER_EMOJIS: Record<string, string> = {
  SeoYeon: "🐶",
  HyeRin: "🐱",
  JiWoo: "🐻",
  ChaeYeon: "🍑",
  YooYeon: "🐰",
  SooMin: "🐿️",
  NaKyoung: "🐈‍⬛",
  YuBin: "🐯",
  Kaede: "🍁",
  DaHyun: "🍒",
  Kotone: "🦭",
  YeonJi: "🧸",
  Nien: "🍓",
  SoHyun: "🐺",
  Xinyu: "🦊",
  Mayu: "🐇",
  Lynn: "🦈",
  JooBin: "🐣",
  HaYeon: "🦔",
  ShiOn: "🍞",
  ChaeWon: "🎀",
  Sullin: "⛄",
  SeoAh: "☀️",
  JiYeon: "🦢",
  HeeJin: "🐰",
  HaSeul: "🦊",
  KimLip: "🦉",
  JinSoul: "🐯",
  Choerry: "🐿",
};

export function getSeasonEmoji(season: string) {
  const key = Object.keys(SEASON_EMOJIS).find((k) => season.startsWith(k));
  return key ? SEASON_EMOJIS[key] : "";
}

function formatMemberName(member: string, options: FormatOptions) {
  const emoji = options.showMemberEmoji ? (MEMBER_EMOJIS[member] ?? "") : "";
  return emoji ? `${emoji}${member}` : member;
}

export type GroupByMode = "none" | "season" | "season-first";
export type FormatStyle = "default" | "compact";

export type FormatOptions = {
  showQuantity: boolean;
  lowercaseCollection: boolean;
  bullet: boolean;
  showMemberEmoji: boolean;
  groupByMode?: GroupByMode;
  style?: FormatStyle;
  compareArtistMember: (a: string, b: string) => number;
  compareSeason: (a: string, b: string) => number;
};

function formatCollection(
  collection: DiscordFormatObjekt,
  quantity: number,
  options: FormatOptions,
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

  const result = `${text}${options.showQuantity && quantity > 1 ? ` (x${quantity})` : ""}`;
  return options.lowercaseCollection ? result.toLowerCase() : result;
}

function formatCollectionsById(
  collections: DiscordFormatObjekt[],
  options: FormatOptions,
  showSeason: boolean,
): string[] {
  const groups = groupBy(collections, (c) => c.collectionId);
  return Object.values(groups)
    .filter((group): group is DiscordFormatObjekt[] => group !== undefined)
    .map((group) => {
      const [collection] = group;
      return formatCollection(collection!, group.length, options, showSeason);
    })
    .toSorted();
}

function formatMemberCollections(
  collections: DiscordFormatObjekt[],
  options: FormatOptions,
  groupBySeason: boolean,
): string[] {
  if (groupBySeason) {
    const seasonGroups = groupBy(collections, (a) => a.season);
    const seasonEntries = Object.entries(seasonGroups).toSorted(([a], [b]) =>
      options.compareSeason(a, b),
    );

    return seasonEntries.flatMap(([season, seasonCollections]) => {
      const formatted = formatCollectionsById(seasonCollections!, options, false);

      if (formatted.length === 0) return [];

      if (options.style === "compact") {
        return [`**${getSeasonEmoji(season)}${season}** ${formatted.join(" ")}`];
      }
      return [
        `${options.bullet ? "- " : ""}${getSeasonEmoji(season)}${season} ${formatted.join(" ")}`,
      ];
    });
  }

  return formatCollectionsById(collections, options, true);
}

export function format(collections: DiscordFormatObjekt[], options: FormatOptions) {
  const {
    groupByMode = "none",
    style = "default",
    bullet,
    compareArtistMember,
    compareSeason,
  } = options;

  if (groupByMode === "season-first") {
    const seasonGroups = groupBy(collections, (a) => a.season);
    const seasonEntries = Object.entries(seasonGroups).toSorted(([a], [b]) => compareSeason(a, b));

    const results: string[] = [];

    for (const [season, seasonCollections] of seasonEntries) {
      if (!seasonCollections) continue;

      const orderedMembers = makeMemberOrderedList(seasonCollections, compareArtistMember);
      const memberMap = mapByMember(seasonCollections, orderedMembers);

      if (style === "compact") {
        const memberParts = Array.from(memberMap.entries()).flatMap(
          ([member, memberCollections]) => {
            const formatted = formatCollectionsById(memberCollections, options, false);
            const name = formatMemberName(member, options);
            return formatted.length > 0 ? `**${name}** ${formatted.join(" ")}` : [];
          },
        );

        if (memberParts.length > 0) {
          results.push(
            `${bullet ? "- " : ""}__${getSeasonEmoji(season)}${season}__ ${memberParts.join(" ")}`,
          );
        }
      } else {
        const memberLines = Array.from(memberMap.entries()).flatMap(
          ([member, memberCollections]) => {
            const formatted = formatCollectionsById(memberCollections, options, false);
            const name = formatMemberName(member, options);
            return formatted.length > 0
              ? [`${bullet ? "- " : ""}${name} ${formatted.join(" ")}`]
              : [];
          },
        );

        if (memberLines.length > 0) {
          results.push(`**${getSeasonEmoji(season)}${season}**`, ...memberLines);
        }
      }
    }

    return results.join("\n");
  }

  // group by member
  const orderedMembers = makeMemberOrderedList(collections, compareArtistMember);
  const memberMap = mapByMember(collections, orderedMembers);

  const lines = Array.from(memberMap.entries())
    .map(([member, memberCollections]) => {
      const formatted = formatMemberCollections(
        memberCollections,
        options,
        groupByMode === "season",
      );

      if (formatted.length === 0) {
        return "";
      }

      const name = formatMemberName(member, options);

      if (groupByMode === "season") {
        if (style === "compact") {
          return `${bullet ? "- " : ""}__${name}__ ${formatted.join(" ")}`;
        }
        // default: **member**\n- season collectionNo
        return `**${name}**\n${formatted.join("\n")}`;
      }

      // format: - member collectionNo (same for both default and compact)
      return `${bullet ? "- " : ""}${name} ${formatted.join(" ")}`;
    })
    .filter((line) => line !== "");

  return lines.join("\n");
}

export function mapByMember(
  entries: DiscordFormatObjekt[],
  members: string[],
): Map<string, DiscordFormatObjekt[]> {
  const grouped = groupBy(entries, (e) => e.member);
  const output = new Map<string, DiscordFormatObjekt[]>();
  for (const member of members) {
    if (grouped[member]) {
      output.set(member, grouped[member]!);
    }
  }
  return output;
}

export function makeMemberOrderedList(
  entries: DiscordFormatObjekt[],
  compareArtistMember: (memberA: string, memberB: string) => number,
) {
  const grouped = groupBy(entries, (a) => a.member);

  const groups = Object.values(grouped).filter(
    (group): group is DiscordFormatObjekt[] => group !== undefined,
  );

  const members = groups
    .toSorted((a, b) => {
      const memberA = a[0]!.member;
      const memberB = b[0]!.member;
      return compareArtistMember(memberA, memberB);
    })
    .map((group) => group[0]!.member);

  return members;
}
