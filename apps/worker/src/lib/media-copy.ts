// The pure rules of the motion-video copy (Decision 9): keys, content sniffing, address checks,
// what is due and the per-run budget. No network, bucket or env access, so it can be tested alone.

import { createHash } from "node:crypto";
import { isIPv4, isIPv6 } from "node:net";

import { acceptMediaUrl } from "@repo/lib/collection-media";

const MIN = 60_000;
const MB = 1024 * 1024;

export const MAX_BYTES = 64 * MB;
const RUN_OBJECTS = 20;
const RUN_BYTES = 300 * MB;
const RUN_MS = 5 * MIN;
const FAIL_STREAK = 3;
const RETRY_AFTER_MS = 6 * 60 * MIN;

const KEY_DIR = "collection-media/motion/";
const HASH_LENGTH = 32;

// Voice collections carry their audio file as `frontMedia`, so audio shares the copy path, the key
// folder and the size cap with video.
export type MediaExt = "mp4" | "webm" | "m4a" | "mp3" | "ogg";

/** Only the source URL's hash and the sniffed extension reach the key: no slug, no URL path. */
export function copyKey(sourceUrl: string, ext: MediaExt) {
  return `${KEY_DIR}${sourceHash(sourceUrl)}.${ext}`;
}

function sourceHash(sourceUrl: string) {
  return createHash("sha256").update(sourceUrl).digest("hex").slice(0, HASH_LENGTH);
}

/** True when the copy's key carries the source's hash, so a changed source makes the copy stale. */
export function copyIsCurrent(copyUrl: string, sourceUrl: string, copyPrefix: string) {
  if (!copyUrl.startsWith(copyPrefix)) return false;
  const rest = copyUrl.slice(copyPrefix.length);
  const hash = sourceHash(sourceUrl);
  return COPY_EXTS.some((ext) => rest === `motion/${hash}.${ext}`);
}

/** The record's copy only while it was made from the record's current source, else null. */
export function currentCopy(
  record: { frontMedia: string | null; frontMediaCopy: string | null },
  copyPrefix: string,
) {
  const { frontMedia: source, frontMediaCopy: copy } = record;
  return source && copy && copyIsCurrent(copy, source, copyPrefix) ? copy : null;
}

const COPY_EXTS: readonly MediaExt[] = ["mp4", "webm", "m4a", "mp3", "ogg"];

const MP4_BRANDS = new Set([
  "isom",
  "iso2",
  "iso3",
  "iso4",
  "iso5",
  "iso6",
  "mp41",
  "mp42",
  "avc1",
  "M4V ",
  // voice Doubles ship some files as QuickTime; H.264 in a `qt` box plays as video/mp4
  "qt  ",
]);

function ascii(bytes: Uint8Array, from: number, to: number) {
  return String.fromCharCode(...bytes.subarray(from, to));
}

/**
 * The content type comes from the bytes, never from the response header. `ftyp` alone also opens
 * HEIC and AVIF, so the major brand must be an MP4, QuickTime or M4A one. MP3 is an ID3 tag or an
 * MPEG layer III frame sync (not ADTS AAC, which shares the first byte); Ogg is `OggS`.
 */
export function sniffVideo(bytes: Uint8Array) {
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12);
    if (MP4_BRANDS.has(brand)) return { contentType: "video/mp4", ext: "mp4" } as const;
    if (brand === "M4A ") return { contentType: "audio/mp4", ext: "m4a" } as const;
    return null;
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return { contentType: "video/webm", ext: "webm" } as const;
  }
  if (bytes.length >= 4 && ascii(bytes, 0, 4) === "OggS") {
    return { contentType: "audio/ogg", ext: "ogg" } as const;
  }
  if (bytes.length >= 4 && ascii(bytes, 0, 3) === "ID3") {
    return { contentType: "audio/mpeg", ext: "mp3" } as const;
  }
  if (bytes.length >= 4 && bytes[0] === 0xff) {
    const b1 = bytes[1]!;
    const syncAndVersion = (b1 & 0xe0) === 0xe0 && ((b1 >> 3) & 3) !== 1;
    if (syncAndVersion && ((b1 >> 1) & 3) === 1) {
      return { contentType: "audio/mpeg", ext: "mp3" } as const;
    }
  }
  return null;
}

function ipv4Public(a: number, b: number, c: number) {
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false; // IETF protocol, TEST-NET-1
  if (a === 192 && b === 88 && c === 99) return false; // 6to4 relay
  if (a === 192 && b === 168) return false;
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a === 198 && b === 51 && c === 100) return false; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return false; // TEST-NET-3
  return true;
}

/** Expands an IPv6 text address to eight 16-bit groups, or null when it is malformed. */
function ipv6Groups(ip: string) {
  let text = ip;
  const dotted = text.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const [a = 0, b = 0, c = 0, d = 0] = dotted[2]!.split(".").map(Number);
    text = `${dotted[1]}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const parts = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  const groups = parts.map((p) => parseInt(p, 16));
  return groups.length === 8 && groups.every((g) => g >= 0 && g <= 0xffff) ? groups : null;
}

/**
 * False for loopback, private, link-local, unique-local, multicast and other reserved addresses,
 * IPv4 and IPv6, and for anything that is not an IP address. An IPv6 address that wraps an IPv4 one
 * (mapped, NAT64, 6to4) is judged by the IPv4 address inside. Only global unicast `2000::/3`
 * passes, minus the documentation, Teredo and 6to4 ranges.
 */
export function isPublicAddress(ip: string) {
  if (isIPv4(ip)) {
    const [a = 0, b = 0, c = 0] = ip.split(".").map(Number);
    return ipv4Public(a, b, c);
  }
  if (!isIPv6(ip)) return false;
  const g = ipv6Groups(ip);
  if (!g) return false;
  const [g0 = 0, g1 = 0, g2 = 0, g3 = 0, g4 = 0, g5 = 0, g6 = 0] = g;
  const embedded = (hi: number, lo: number) => ipv4Public(hi >> 8, hi & 0xff, lo >> 8);
  // ::ffff:a.b.c.d, and the deprecated ::a.b.c.d
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && (g5 === 0xffff || g5 === 0)) {
    return g5 === 0xffff ? embedded(g6, g[7]!) : false;
  }
  // 64:ff9b::/96 NAT64
  if (g0 === 0x64 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    return embedded(g6, g[7]!);
  }
  if ((g0 & 0xe000) !== 0x2000) return false; // not global unicast
  if (g0 === 0x2001 && (g1 === 0 || g1 === 0xdb8)) return false; // Teredo, documentation
  if (g0 === 0x2002) return false; // 6to4
  return true;
}

/** What `dueCopies` reads of a `collection_media` row; times are epoch milliseconds. */
export type CopyRecord = {
  slug: string;
  frontMedia: string | null;
  frontMediaCopy: string | null;
  frontMediaFailedAt: number | null;
  observedAt: number;
};

export type DueDownload = { source: string; slugs: string[]; observedAt: number };
/** A source whose copy already exists for another record: set `copyUrl`, download nothing. */
export type DueReuse = { source: string; copyUrl: string; slugs: string[] };

/**
 * The motion sources to copy. A record is due when its source passes `acceptMediaUrl`, its copy is
 * missing or made from another source, its last failure is null or over 6 hours old, and its slug
 * is an indexer collection. Due records are grouped by source (one download however many share
 * it), oldest `observed_at` first. A source whose current copy another record holds is a reuse,
 * whatever the failure time, since it needs no download. `copyPrefix` is `<S3_PUBLIC_URL>/collection-media/`.
 */
export function dueCopies(
  records: readonly CopyRecord[],
  indexerSlugs: ReadonlySet<string>,
  now: number,
  copyPrefix: string,
) {
  const held = new Map<string, string>();
  for (const r of records) {
    const { frontMedia: source, frontMediaCopy: copy } = r;
    if (source && copy && copyIsCurrent(copy, source, copyPrefix)) held.set(source, copy);
  }

  const groups = new Map<string, DueDownload>();
  const reuses = new Map<string, DueReuse>();
  for (const r of records) {
    const source = r.frontMedia;
    if (!source || !indexerSlugs.has(r.slug) || !acceptMediaUrl(source)) continue;
    if (r.frontMediaCopy && copyIsCurrent(r.frontMediaCopy, source, copyPrefix)) continue;

    const copyUrl = held.get(source);
    if (copyUrl) {
      const reuse = reuses.get(source) ?? { source, copyUrl, slugs: [] };
      reuse.slugs.push(r.slug);
      reuses.set(source, reuse);
      continue;
    }
    if (r.frontMediaFailedAt !== null && now - r.frontMediaFailedAt <= RETRY_AFTER_MS) continue;
    const group = groups.get(source) ?? { source, slugs: [], observedAt: r.observedAt };
    group.slugs.push(r.slug);
    group.observedAt = Math.min(group.observedAt, r.observedAt);
    groups.set(source, group);
  }
  return {
    downloads: [...groups.values()].sort((a, b) => a.observedAt - b.observedAt),
    reuses: [...reuses.values()],
  };
}

/** Why a download failed; only the first three count towards the run's failure streak. */
export type CopyFailure = "rate_limited" | "server_error" | "timeout" | "other";

/**
 * One run's limits: 20 attempts (a failed one counts too), 200 MB and 5 minutes, and a stop after
 * 3 downloads in a row fail with a 429, a 5xx or a timeout. Any other outcome ends the streak. Bytes read by a failed
 * download count, so a host that keeps cutting off still spends the budget.
 */
export function createCopyBudget(now: number) {
  let objects = 0;
  let bytes = 0;
  let streak = 0;
  return {
    canStart(at: number) {
      return (
        objects < RUN_OBJECTS && bytes < RUN_BYTES && at - now < RUN_MS && streak < FAIL_STREAK
      );
    },
    success(size: number) {
      objects += 1;
      bytes += size;
      streak = 0;
    },
    failure(reason: CopyFailure, bytesRead = 0) {
      objects += 1;
      bytes += bytesRead;
      streak = reason === "other" ? 0 : streak + 1;
    },
    get used() {
      return { objects, bytes };
    },
  };
}

/** The reason a non-2xx answer is counted under, and whether it counts towards the failure streak. */
export function failureForStatus(status: number): { reason: string; kind: CopyFailure } {
  if (status >= 300 && status < 400) return { reason: "redirect", kind: "other" };
  if (status === 429) return { reason: "rate_limited", kind: "rate_limited" };
  if (status >= 500) return { reason: "server_error", kind: "server_error" };
  return { reason: "http_4xx", kind: "other" };
}
