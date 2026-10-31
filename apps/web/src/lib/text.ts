import { getLocale } from "@/paraglide/runtime";

/** Japanese runs sentences together; en and ko put a space between. */
export const sentenceGap = (locale: string = getLocale()) => (locale === "ja" ? "" : " ");

export const joinSentences = (
  parts: readonly (string | null | undefined)[],
  locale: string = getLocale(),
) => parts.filter(Boolean).join(sentenceGap(locale));

const listFormats = new Map<string, Intl.ListFormat>();

/** `prose` for a sentence ("A, B, and C"), `compact` for a dense line ("A, B, C"). */
export function joinList(
  items: readonly string[],
  kind: "prose" | "compact" = "prose",
  locale: string = getLocale(),
) {
  const key = `${locale}:${kind}`;
  let format = listFormats.get(key);
  if (!format) {
    format = new Intl.ListFormat(locale, {
      type: "conjunction",
      style: kind === "prose" ? "long" : "narrow",
    });
    listFormats.set(key, format);
  }
  return format.format(items);
}
