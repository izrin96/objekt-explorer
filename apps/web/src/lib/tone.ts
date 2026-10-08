/**
 * The colours a mark can take: list types, trade progress and outcomes. A chip is ink on a fill
 * with an edge, in Badge's own recipe (8% fill and 30% edge, 16% and 20% in dark), so every
 * chip in the app weighs the same.
 */
export type Tone =
  | "have"
  | "want"
  | "sale"
  | "progress"
  | "success"
  | "warning"
  | "destructive"
  | "neutral";

export const TONE_INK: Record<Tone, string> = {
  have: "text-type-have",
  want: "text-type-want",
  sale: "text-type-sale",
  progress: "text-progress",
  success: "text-success-foreground",
  warning: "text-warning-foreground",
  destructive: "text-destructive-foreground",
  neutral: "text-muted-foreground",
};

export const TONE_FILL: Record<Tone, string> = {
  have: "bg-type-have/8 dark:bg-type-have/16",
  want: "bg-type-want/8 dark:bg-type-want/16",
  sale: "bg-type-sale/8 dark:bg-type-sale/16",
  progress: "bg-progress/8 dark:bg-progress/16",
  success: "bg-success/8 dark:bg-success/16",
  warning: "bg-warning/8 dark:bg-warning/16",
  destructive: "bg-destructive/8 dark:bg-destructive/16",
  neutral: "bg-muted",
};

export const TONE_EDGE: Record<Tone, string> = {
  have: "border-type-have/30 dark:border-type-have/20",
  want: "border-type-want/30 dark:border-type-want/20",
  sale: "border-type-sale/30 dark:border-type-sale/20",
  progress: "border-progress/30 dark:border-progress/20",
  success: "border-success/30 dark:border-success/20",
  warning: "border-warning/30 dark:border-warning/20",
  destructive: "border-destructive/30 dark:border-destructive/20",
  neutral: "border-border",
};

/** A solid mark, such as a step's top bar. */
export const TONE_BAR: Record<Tone, string> = {
  have: "border-type-have",
  want: "border-type-want",
  sale: "border-type-sale",
  progress: "border-progress",
  success: "border-success",
  warning: "border-warning",
  destructive: "border-destructive",
  neutral: "border-border",
};

/** Neutral is no colour at all: the chip keeps its own outline. */
export function toneChip(tone: Tone) {
  return tone === "neutral" ? "" : `${TONE_EDGE[tone]} ${TONE_FILL[tone]} ${TONE_INK[tone]}`;
}
