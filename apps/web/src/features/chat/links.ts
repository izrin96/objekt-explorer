export type TextPart =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string };

// The host is ASCII, so text typed straight after a bare domain is not part of it
// ("https://a.com에서" links https://a.com). The path takes any non-space character, so a
// human-readable link like https://namu.wiki/w/이달의_소녀 stays whole.
const URL_RE = /\bhttps?:\/\/[\w\-.~:@!$&'()*+,;=%[\]]+(?:[/?#][^\s<>"]*)?/gi;
const TRAILING = /[.,;:!?'*。、，．！？：；…]+$/u;
const PAIRS: Record<string, string> = { ")": "(", "]": "[", "）": "（", "」": "「", "』": "『" };

/** Sentence punctuation after a link stays text, and so does a closing bracket it never opened. */
function trimLink(raw: string) {
  let url = raw;
  for (;;) {
    const trimmed = url.replace(TRAILING, "");
    const close = trimmed.at(-1) ?? "";
    const open = PAIRS[close];
    if (open && count(trimmed, open) < count(trimmed, close)) {
      url = trimmed.slice(0, -1);
    } else {
      return trimmed;
    }
  }
}

function count(text: string, char: string) {
  return text.split(char).length - 1;
}

// `URL.canParse` needs Chrome 120, and `client.tsx` hydrates from Chrome 117.
function parses(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/** Splits a message into text and http(s) links; any other scheme stays text. */
export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const url = trimLink(match[0]);
    if (!parses(url)) continue;
    if (match.index > last) parts.push({ kind: "text", text: text.slice(last, match.index) });
    parts.push({ kind: "link", text: url, href: url });
    last = match.index + url.length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}
