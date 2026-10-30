import type { FormatOptions, FormatStyle, GroupByMode } from "./format";

export type FormatChoices = {
  showCount: boolean;
  includeLink: boolean;
  lowercaseCollection: boolean;
  bullet: boolean;
  showMemberEmoji: boolean;
  hideType: boolean;
  groupBy: GroupByMode;
  style: FormatStyle;
};

export type FormatFlag = Exclude<keyof FormatChoices, "groupBy" | "style">;

export const EMPTY_CHOICES: FormatChoices = {
  showCount: false,
  includeLink: false,
  lowercaseCollection: false,
  bullet: false,
  showMemberEmoji: false,
  hideType: false,
  groupBy: "none",
  style: "default",
};

/** Compact only differs once there is a grouping to compact. */
export function withGroupBy(choices: FormatChoices, next: GroupByMode | null): FormatChoices {
  const groupBy = next ?? "none";
  return { ...choices, groupBy, style: groupBy === "none" ? "default" : choices.style };
}

export function toFormatOptions(
  choices: FormatChoices,
  compareArtistMember: FormatOptions["compareArtistMember"],
  compareSeason: FormatOptions["compareSeason"],
): FormatOptions {
  return {
    showQuantity: choices.showCount,
    lowercaseCollection: choices.lowercaseCollection,
    bullet: choices.bullet,
    showMemberEmoji: choices.showMemberEmoji,
    hideType: choices.hideType,
    groupByMode: choices.groupBy,
    style: choices.style,
    compareArtistMember,
    compareSeason,
  };
}

export type Section = {
  heading: string;
  /** a rule is one line in its own words, before the objekts */
  rules?: string[];
  body?: string;
  url?: string | null;
};

/** The text is English in every locale: it is pasted into mixed-language trading channels. */
export function joinSections(sections: Section[], bullet: boolean): string {
  const lines: string[] = [];
  for (const section of sections) {
    if (lines.length > 0) lines.push("");
    lines.push(section.heading, "");
    for (const rule of section.rules ?? []) lines.push(bullet ? `- ${rule}` : rule);
    if (section.body !== undefined) lines.push(section.body);
    if (section.url) lines.push("", `[View list](<${section.url}>)`);
  }
  return lines.join("\n");
}
