import type { Tone } from "@/lib/tone";

/** An alert's objekts keep their list type's colour; it is the one colour a row has besides class stripes. */
export const TONE_FRAME: Partial<Record<Tone, string>> = {
  want: "outline-type-want",
  have: "outline-type-have",
};
