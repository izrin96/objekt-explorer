/**
 * What someone pasted to name a list: its ID, a `/list/<id>` link, or the
 * profile-scoped `/@<nickname>/list/<name>` link a bound list lives at, whose
 * last segment is the profile slug, not the ID.
 */
export type ListInput = { slug: string } | { nickname: string; profileSlug: string };

const PROFILE_LIST = /(?:^|\/)(?:@|%40)([^/?#]+)\/list\/([^/?#]+)/i;
const PLAIN_LIST = /(?:^|\/)list\/([^/?#]+)/;

export function parseListInput(input: string): ListInput {
  const text = input.trim();

  const scoped = PROFILE_LIST.exec(text);
  if (scoped) return { nickname: decode(scoped[1]!), profileSlug: decode(scoped[2]!) };

  const plain = PLAIN_LIST.exec(text);
  if (plain) return { slug: decode(plain[1]!) };

  return { slug: text };
}

function decode(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
