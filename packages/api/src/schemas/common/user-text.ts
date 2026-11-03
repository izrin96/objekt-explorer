// text-direction marks (embedding, override, isolate, and the implicit LRM, RLM and ALM) can
// make text read as someone else's
const HIDDEN_CHARS = /(?!\n)[\p{Cc}\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu;
// what a text made only of these would show as an empty block: spaces, every default-ignorable
// code point (zero-width marks, Hangul fillers, tag characters, variation selectors) and the
// blank Braille cell, which Unicode does not count as ignorable
const INVISIBLE_ONLY = /^[\s\p{Default_Ignorable_Code_Point}\u2800]*$/u;

/**
 * A bio or a list description as stored, or null when nothing visible is left. Only what is
 * unsafe or invisible goes: indentation, blank lines and filler rows are decoration and stay.
 */
export function normalizeUserText(text: string): string | null {
  const lines = text
    .replace(/\r\n?|[\u2028\u2029]/g, "\n")
    .replace(/\t/g, " ")
    .replace(HIDDEN_CHARS, "")
    .split("\n")
    .map((line) => line.trimEnd());
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start] === "") start += 1;
  while (end > start && lines[end - 1] === "") end -= 1;
  const clean = lines.slice(start, end).join("\n");
  return INVISIBLE_ONLY.test(clean) ? null : clean;
}
