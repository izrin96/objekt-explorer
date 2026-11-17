import { describe, expect, test } from "bun:test";

import {
  copyIsCurrent,
  copyKey,
  createCopyBudget,
  dueCopies,
  failureForStatus,
  isPublicAddress,
  MAX_BYTES,
  sniffVideo,
  type CopyRecord,
} from "./media-copy";

const prefix = "https://cdn.example.com/collection-media/";
const a = "https://resources.cosmo.fans/objekt/a.mp4";
const b = "https://resources.cosmo.fans/objekt/b.mp4";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (s: string) => Array.from(Buffer.from(s, "latin1"));
const ftyp = (brand: string) => bytes(0, 0, 0, 0x18, ...text("ftyp"), ...text(brand), 0, 0, 0, 0);

describe("copyKey", () => {
  test("one source always gives one key, and two sources two", () => {
    expect(copyKey(a, "mp4")).toBe(copyKey(a, "mp4"));
    expect(copyKey(a, "mp4")).not.toBe(copyKey(b, "mp4"));
  });

  test("the key is a 32-hex hash and the extension, in the motion folder", () => {
    expect(copyKey(a, "webm")).toMatch(/^collection-media\/motion\/[0-9a-f]{32}\.webm$/);
    expect(copyKey(a, "m4a")).toMatch(/^collection-media\/motion\/[0-9a-f]{32}\.m4a$/);
  });

  test("no slug or URL path reaches the key", () => {
    const key = copyKey("https://resources.cosmo.fans/secret-path/atom01-yeonji-101z.mp4", "mp4");
    expect(key).not.toContain("secret-path");
    expect(key).not.toContain("atom01");
    expect(key).not.toContain("yeonji");
  });
});

describe("copyIsCurrent", () => {
  const url = (source: string, ext = "mp4") =>
    `${prefix}motion/${copyKey(source, "mp4").slice("collection-media/motion/".length, -3)}${ext}`;

  test("true when the key carries the source's hash", () => {
    expect(copyIsCurrent(url(a), a, prefix)).toBe(true);
    expect(copyIsCurrent(url(a, "webm"), a, prefix)).toBe(true);
    for (const ext of ["m4a", "mp3", "ogg"]) {
      expect(copyIsCurrent(url(a, ext), a, prefix)).toBe(true);
    }
  });

  test("a changed source makes the copy not current", () => {
    expect(copyIsCurrent(url(a), b, prefix)).toBe(false);
  });

  test("a foreign host, a query string or another extension is not current", () => {
    expect(copyIsCurrent(url(a).replace("cdn.example.com", "evil.net"), a, prefix)).toBe(false);
    expect(copyIsCurrent(`${url(a)}?x=1`, a, prefix)).toBe(false);
    expect(copyIsCurrent(url(a, "gif"), a, prefix)).toBe(false);
  });
});

describe("sniffVideo", () => {
  test("MP4 by an allowed major brand", () => {
    for (const brand of ["isom", "iso2", "iso6", "mp41", "mp42", "avc1", "M4V "]) {
      expect(sniffVideo(ftyp(brand))).toEqual({ contentType: "video/mp4", ext: "mp4" });
    }
  });

  test("WebM", () => {
    expect(sniffVideo(bytes(0x1a, 0x45, 0xdf, 0xa3, 0x01))).toEqual({
      contentType: "video/webm",
      ext: "webm",
    });
  });

  test("an M4A brand is audio/mp4", () => {
    expect(sniffVideo(ftyp("M4A "))).toEqual({ contentType: "audio/mp4", ext: "m4a" });
  });

  test("MP3 by an ID3 tag or an MPEG layer III frame sync", () => {
    const mp3 = { contentType: "audio/mpeg", ext: "mp3" } as const;
    expect(sniffVideo(bytes(...text("ID3"), 4, 0, 0, 0, 0, 0, 0, 0))).toEqual(mp3);
    expect(sniffVideo(bytes(0xff, 0xfb, 0x90, 0x00))).toEqual(mp3); // MPEG-1 layer III
    expect(sniffVideo(bytes(0xff, 0xf3, 0x90, 0x00))).toEqual(mp3); // MPEG-2 layer III
  });

  test("refuses an MPEG frame that is not layer III, ADTS AAC and a lone ID", () => {
    expect(sniffVideo(bytes(0xff, 0xfd, 0x90, 0x00))).toBeNull(); // layer II
    expect(sniffVideo(bytes(0xff, 0xf1, 0x50, 0x80))).toBeNull(); // ADTS AAC
    expect(sniffVideo(bytes(...text("ID")))).toBeNull();
  });

  test("Ogg", () => {
    expect(sniffVideo(bytes(...text("OggS"), 0, 2, 0, 0))).toEqual({
      contentType: "audio/ogg",
      ext: "ogg",
    });
  });

  test("refuses QuickTime, HEIC and AVIF, which share ftyp", () => {
    expect(sniffVideo(ftyp("qt  "))).toBeNull();
    expect(sniffVideo(ftyp("heic"))).toBeNull();
    expect(sniffVideo(ftyp("avif"))).toBeNull();
  });

  test("refuses an HTML body and short bodies", () => {
    expect(sniffVideo(bytes(...text("<!doctype html><html>")))).toBeNull();
    expect(sniffVideo(bytes(0x1a, 0x45, 0xdf))).toBeNull();
    expect(sniffVideo(bytes(1, 2, 3))).toBeNull();
    expect(sniffVideo(new Uint8Array())).toBeNull();
  });
});

describe("isPublicAddress", () => {
  test("refuses loopback, private, link-local and unique-local addresses", () => {
    for (const ip of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "fd00::1"]) {
      expect(isPublicAddress(ip)).toBe(false);
    }
  });

  test("an IPv4 address inside an IPv6 one is judged as IPv4", () => {
    expect(isPublicAddress("::ffff:127.0.0.1")).toBe(false);
    expect(isPublicAddress("::ffff:10.0.0.1")).toBe(false);
    expect(isPublicAddress("::ffff:8.8.8.8")).toBe(true);
    expect(isPublicAddress("64:ff9b::808:808")).toBe(true);
  });

  test("refuses other reserved ranges and what is not an address", () => {
    for (const ip of [
      "0.0.0.0",
      "172.16.0.1",
      "192.168.1.1",
      "100.64.0.1",
      "224.0.0.1",
      "::",
      "fe80::1",
      "::ffff:127.0.0.1",
      "::ffff:7f00:1",
      "64:ff9b::a00:1",
      "2002::1",
      "example.com",
      "",
    ]) {
      expect(isPublicAddress(ip)).toBe(false);
    }
  });

  test("accepts public addresses", () => {
    expect(isPublicAddress("8.8.8.8")).toBe(true);
    expect(isPublicAddress("104.18.2.2")).toBe(true);
    expect(isPublicAddress("2606:4700::1111")).toBe(true);
    expect(isPublicAddress("::ffff:8.8.8.8")).toBe(true);
  });
});

describe("dueCopies", () => {
  const HOUR = 3_600_000;
  const now = Date.parse("2026-11-17T12:00:00Z");
  const indexer = new Set(["s1", "s2", "s3"]);
  const record = (over: Partial<CopyRecord> & { slug: string }): CopyRecord => ({
    frontMedia: a,
    frontMediaCopy: null,
    frontMediaFailedAt: null,
    observedAt: now - 10 * HOUR,
    ...over,
  });
  const copyOf = (source: string) =>
    `${prefix}${copyKey(source, "mp4").slice("collection-media/".length)}`;

  test("a record with a missing copy is due", () => {
    const { downloads } = dueCopies([record({ slug: "s1" })], indexer, now, prefix);
    expect(downloads).toEqual([{ source: a, slugs: ["s1"], observedAt: now - 10 * HOUR }]);
  });

  test("a failure 5 hours ago is not due, 7 hours ago is", () => {
    const at = (h: number) => now - h * HOUR;
    expect(
      dueCopies([record({ slug: "s1", frontMediaFailedAt: at(5) })], indexer, now, prefix)
        .downloads,
    ).toEqual([]);
    expect(
      dueCopies([record({ slug: "s1", frontMediaFailedAt: at(7) })], indexer, now, prefix)
        .downloads,
    ).toHaveLength(1);
  });

  test("a record with only a band image has nothing due", () => {
    const r = record({ slug: "s1", frontMedia: null });
    expect(dueCopies([r], indexer, now, prefix)).toEqual({ downloads: [], reuses: [] });
  });

  test("a slug missing from the indexer is not due", () => {
    expect(dueCopies([record({ slug: "ghost" })], indexer, now, prefix).downloads).toEqual([]);
  });

  test("a source off the allowlist is not due", () => {
    const r = record({ slug: "s1", frontMedia: "https://evil.example/x.mp4" });
    expect(dueCopies([r], indexer, now, prefix).downloads).toEqual([]);
  });

  test("a current copy is not due; a copy of another source is", () => {
    const current = record({ slug: "s1", frontMediaCopy: copyOf(a) });
    expect(dueCopies([current], indexer, now, prefix)).toEqual({ downloads: [], reuses: [] });
    const stale = record({ slug: "s1", frontMediaCopy: copyOf(b) });
    expect(dueCopies([stale], indexer, now, prefix).downloads).toHaveLength(1);
  });

  test("two records with one source are one download", () => {
    const { downloads } = dueCopies(
      [record({ slug: "s1" }), record({ slug: "s2", observedAt: now - 20 * HOUR })],
      indexer,
      now,
      prefix,
    );
    expect(downloads).toEqual([{ source: a, slugs: ["s1", "s2"], observedAt: now - 20 * HOUR }]);
  });

  test("the oldest observed_at goes first", () => {
    const { downloads } = dueCopies(
      [
        record({ slug: "s1", frontMedia: a, observedAt: now - 1 * HOUR }),
        record({ slug: "s2", frontMedia: b, observedAt: now - 5 * HOUR }),
      ],
      indexer,
      now,
      prefix,
    );
    expect(downloads.map((d) => d.source)).toEqual([b, a]);
  });

  test("a source already copied for another record is a reuse, even after a recent failure", () => {
    const { downloads, reuses } = dueCopies(
      [
        record({ slug: "s1", frontMediaCopy: copyOf(a) }),
        record({ slug: "s2", frontMediaFailedAt: now - HOUR }),
      ],
      indexer,
      now,
      prefix,
    );
    expect(downloads).toEqual([]);
    expect(reuses).toEqual([{ source: a, copyUrl: copyOf(a), slugs: ["s2"] }]);
  });
});

describe("createCopyBudget", () => {
  const start = 1_000_000;

  test("stops at 20 objects", () => {
    const budget = createCopyBudget(start);
    for (let i = 0; i < 20; i++) {
      expect(budget.canStart(start)).toBe(true);
      budget.success(1);
    }
    expect(budget.canStart(start)).toBe(false);
  });

  test("failed attempts count towards the 20 objects", () => {
    const budget = createCopyBudget(start);
    for (let i = 0; i < 20; i++) {
      expect(budget.canStart(start)).toBe(true);
      budget.failure(i % 2 ? "other" : "timeout");
    }
    expect(budget.canStart(start)).toBe(false);
    expect(budget.used.objects).toBe(20);
  });

  test("bytes read by a failed download count", () => {
    const budget = createCopyBudget(start);
    budget.failure("other", 200 * 1024 * 1024);
    expect(budget.canStart(start)).toBe(false);
  });

  test("stops at 200 MB", () => {
    const budget = createCopyBudget(start);
    budget.success(MAX_BYTES);
    expect(budget.canStart(start)).toBe(true);
    for (let i = 0; i < 6; i++) budget.success(MAX_BYTES);
    expect(budget.canStart(start)).toBe(false);
  });

  test("stops after 5 minutes", () => {
    const budget = createCopyBudget(start);
    expect(budget.canStart(start + 4 * 60_000)).toBe(true);
    expect(budget.canStart(start + 5 * 60_000)).toBe(false);
  });

  test("stops after 3 failures in a row, and another outcome ends the streak", () => {
    const budget = createCopyBudget(start);
    budget.failure("rate_limited");
    budget.failure("server_error");
    budget.failure("other");
    budget.failure("timeout");
    budget.failure("timeout");
    expect(budget.canStart(start)).toBe(true);
    budget.failure("server_error");
    expect(budget.canStart(start)).toBe(false);
  });

  test("a success ends the streak", () => {
    const budget = createCopyBudget(start);
    budget.failure("timeout");
    budget.failure("timeout");
    budget.success(1);
    budget.failure("timeout");
    expect(budget.canStart(start)).toBe(true);
  });
});

describe("failureForStatus", () => {
  test("a redirect fails and is not a streak failure", () => {
    expect(failureForStatus(301)).toEqual({ reason: "redirect", kind: "other" });
    expect(failureForStatus(399)).toEqual({ reason: "redirect", kind: "other" });
  });

  test("429 and 5xx count towards the streak", () => {
    expect(failureForStatus(429)).toEqual({ reason: "rate_limited", kind: "rate_limited" });
    expect(failureForStatus(503)).toEqual({ reason: "server_error", kind: "server_error" });
  });

  test("another 4xx is its own reason and ends the streak", () => {
    expect(failureForStatus(404)).toEqual({ reason: "http_4xx", kind: "other" });
  });
});
