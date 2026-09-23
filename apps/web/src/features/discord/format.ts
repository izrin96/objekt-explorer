import type { ValidObjekt } from "@repo/lib/types/objekt";

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

const MEMBER_EMOJIS: Record<string, string> = {
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

export type GroupByMode = "none" | "season" | "season-first";
export type FormatStyle = "default" | "compact";

export type FormatOptions = {
  showQuantity: boolean;
  lowercaseCollection: boolean;
  bullet: boolean;
  showMemberEmoji: boolean;
  hideType: boolean;
  groupByMode: GroupByMode;
  style: FormatStyle;
  compareArtistMember: (a: string, b: string) => number;
  compareSeason: (a: string, b: string) => number;
};

function getSeasonEmoji(season: string): string {
  const key = Object.keys(SEASON_EMOJIS).find((name) => season.startsWith(name));
  return key ? (SEASON_EMOJIS[key] ?? "") : "";
}

function formatMemberName(member: string, options: FormatOptions): string {
  const emoji = options.showMemberEmoji ? (MEMBER_EMOJIS[member] ?? "") : "";
  return emoji ? `${emoji}${member}` : member;
}

function formatCollection(
  collection: DiscordFormatObjekt,
  quantity: number,
  options: FormatOptions,
  showSeason: boolean,
): string {
  const collectionNo = options.hideType
    ? collection.collectionNo.slice(0, -1)
    : collection.collectionNo;

  let text: string;
  if (collection.artist === "idntt") {
    const season = showSeason
      ? `${getSeasonEmoji(collection.season)}${collection.season.slice(-2)} `
      : "";
    text = `${season}${collectionNo}`;
  } else {
    const seasonCode = collection.season.charAt(0);
    const seasonNumber = collection.season.slice(-2);
    text = `${seasonCode.repeat(Number(seasonNumber))}${collectionNo}`;
  }

  const result = `${text}${options.showQuantity && quantity > 1 ? ` (x${quantity})` : ""}`;
  return options.lowercaseCollection ? result.toLowerCase() : result;
}

function formatCollectionsById(
  collections: DiscordFormatObjekt[],
  options: FormatOptions,
  showSeason: boolean,
): string[] {
  const groups = Object.groupBy(collections, (collection) => collection.collectionId);
  return Object.values(groups)
    .filter((group) => group !== undefined)
    .map((group) => formatCollection(group[0]!, group.length, options, showSeason))
    .toSorted();
}

function seasonEntries(collections: DiscordFormatObjekt[], options: FormatOptions) {
  const groups = Object.groupBy(collections, (collection) => collection.season);
  return Object.entries(groups)
    .filter((entry): entry is [string, DiscordFormatObjekt[]] => entry[1] !== undefined)
    .toSorted(([a], [b]) => options.compareSeason(a, b));
}

function formatMemberCollections(
  collections: DiscordFormatObjekt[],
  options: FormatOptions,
  groupBySeason: boolean,
): string[] {
  if (!groupBySeason) return formatCollectionsById(collections, options, true);

  return seasonEntries(collections, options).flatMap(([season, seasonCollections]) => {
    const formatted = formatCollectionsById(seasonCollections, options, false);
    if (formatted.length === 0) return [];
    if (options.style === "compact") {
      return [`**${getSeasonEmoji(season)}${season}** ${formatted.join(" ")}`];
    }
    return [
      `${options.bullet ? "- " : ""}${getSeasonEmoji(season)}${season} ${formatted.join(" ")}`,
    ];
  });
}

function mapByMember(
  entries: DiscordFormatObjekt[],
  compareArtistMember: (a: string, b: string) => number,
): Map<string, DiscordFormatObjekt[]> {
  const grouped = Object.groupBy(entries, (entry) => entry.member);
  const groups = Object.entries(grouped)
    .filter((entry): entry is [string, DiscordFormatObjekt[]] => entry[1] !== undefined)
    .toSorted(([a], [b]) => compareArtistMember(a, b));
  return new Map(groups);
}

export function format(collections: DiscordFormatObjekt[], options: FormatOptions): string {
  const { groupByMode, style, bullet, compareArtistMember } = options;

  if (groupByMode === "season-first") {
    const results: string[] = [];

    for (const [season, seasonCollections] of seasonEntries(collections, options)) {
      const memberMap = mapByMember(seasonCollections, compareArtistMember);

      if (style === "compact") {
        const parts = Array.from(memberMap.entries()).flatMap(([member, memberCollections]) => {
          const formatted = formatCollectionsById(memberCollections, options, false);
          if (formatted.length === 0) return [];
          return `**${formatMemberName(member, options)}** ${formatted.join(" ")}`;
        });
        if (parts.length > 0) {
          results.push(
            `${bullet ? "- " : ""}__${getSeasonEmoji(season)}${season}__ ${parts.join(" ")}`,
          );
        }
        continue;
      }

      const lines = Array.from(memberMap.entries()).flatMap(([member, memberCollections]) => {
        const formatted = formatCollectionsById(memberCollections, options, false);
        if (formatted.length === 0) return [];
        return [`${bullet ? "- " : ""}${formatMemberName(member, options)} ${formatted.join(" ")}`];
      });
      if (lines.length > 0) {
        results.push(`**${getSeasonEmoji(season)}${season}**`, ...lines);
      }
    }

    return results.join("\n");
  }

  const memberMap = mapByMember(collections, compareArtistMember);

  return Array.from(memberMap.entries())
    .map(([member, memberCollections]) => {
      const formatted = formatMemberCollections(
        memberCollections,
        options,
        groupByMode === "season",
      );
      if (formatted.length === 0) return "";

      const name = formatMemberName(member, options);

      if (groupByMode === "season") {
        return style === "compact"
          ? `${bullet ? "- " : ""}__${name}__ ${formatted.join(" ")}`
          : `**${name}**\n${formatted.join("\n")}`;
      }

      return `${bullet ? "- " : ""}${name} ${formatted.join(" ")}`;
    })
    .filter((line) => line !== "")
    .join("\n");
}
