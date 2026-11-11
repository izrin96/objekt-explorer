import type { PostSideData } from "./post-types";

/** A side with no objekts, narrowed out or never listed: it shows as one line, not a strip. */
export function isEmptySide(side: PostSideData) {
  return side.copyCount === 0;
}
