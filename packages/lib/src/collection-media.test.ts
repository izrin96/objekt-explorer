import { describe, expect, test } from "bun:test";

import {
  acceptCopyUrl,
  acceptMediaUrl,
  mediaKind,
  mergeRecord,
  type MediaCopies,
  type MediaRecord,
  observe,
  planMediaWrite,
  rejectedHosts,
  type StoredMedia,
} from "./collection-media";

const DAY = 86_400_000;
const now = Date.parse("2026-11-17T00:00:00Z");

const empty: MediaRecord = {
  frontMedia: null,
  bandImageUrl: null,
  hasVoice: false,
  backImage: null,
  accentColor: null,
  textColor: null,
};

const motion = "https://resources.cosmo.fans/motion/a.mp4";
const motion2 = "https://resources.cosmo.fans/motion/b.mp4";
const band = "https://imagedelivery.net/hash/band/public";
const back = "https://imagedelivery.net/hash/back/public";
const prefix = "https://cdn.example.com/collection-media/";
const copy = `${prefix}motion/aaaa.mp4`;
const copy2 = `${prefix}motion/bbbb.mp4`;

function stored(over: Partial<StoredMedia> = {}): StoredMedia {
  return { ...empty, observedAt: now - 20 * DAY, confirmedAt: now - DAY, ...over };
}

const summary = (over: Record<string, unknown> = {}) => ({
  collectionId: "Atom01 Yeonji 101Z",
  frontMedia: null,
  bandImageUrl: null,
  hasVoice: false,
  backImage: null,
  accentColor: null,
  textColor: null,
  ...over,
});

describe("observe", () => {
  test("keys records by slugifyObjekt(collectionId)", () => {
    const records = observe([summary({ frontMedia: motion })]);
    expect([...records.keys()]).toEqual(["atom01-yeonji-101z"]);
    expect(records.get("atom01-yeonji-101z")?.frontMedia).toBe(motion);
  });

  test("an empty string is no value", () => {
    const r = observe([summary({ backImage: "", accentColor: "", frontMedia: motion })]);
    expect(r.get("atom01-yeonji-101z")?.backImage).toBeNull();
  });

  test("a collection that reports nothing is left out", () => {
    expect(observe([summary()]).size).toBe(0);
  });

  test("a malformed colour, an http URL and an unknown host become null", () => {
    const r = observe([
      summary({
        accentColor: "red",
        textColor: "#12345",
        frontMedia: "http://resources.cosmo.fans/a.mp4",
        bandImageUrl: "https://evil.example/a.png",
        hasVoice: true,
      }),
    ]).get("atom01-yeonji-101z");
    expect(r).toEqual({ ...empty, hasVoice: true });
  });

  test("a back image over http, on a foreign host or over 1,024 characters is dropped", () => {
    const bad = [
      "http://imagedelivery.net/h/back/public",
      "https://evil.example/back.png",
      `https://imagedelivery.net/${"a".repeat(1024)}`,
    ];
    for (const backImage of bad) {
      const r = observe([summary({ backImage, hasVoice: true })]).get("atom01-yeonji-101z");
      expect(r?.backImage).toBeNull();
    }
  });

  test("a colour is kept lowercase", () => {
    const r = observe([summary({ textColor: "#FFAA00" })]).get("atom01-yeonji-101z");
    expect(r?.textColor).toBe("#ffaa00");
  });

  test("two items of one slug merge, first non-empty first", () => {
    const r = observe([
      summary({ frontMedia: motion }),
      summary({ frontMedia: motion2, hasVoice: true }),
    ]);
    const rec = r.get("atom01-yeonji-101z");
    expect(rec?.frontMedia).toBe(motion);
    expect(rec?.hasVoice).toBe(true);
  });
});

describe("rejectedHosts", () => {
  test("names the host of a refused URL, never the URL", () => {
    const hosts = rejectedHosts([
      summary({ frontMedia: "https://evil.example/secret?token=1", bandImageUrl: band }),
    ]);
    expect(hosts).toEqual(["evil.example"]);
  });
});

describe("acceptMediaUrl", () => {
  test("accepts the two probed hosts and any *.cosmo.fans", () => {
    expect(acceptMediaUrl(motion)).toBe(true);
    expect(acceptMediaUrl(band)).toBe(true);
    expect(acceptMediaUrl("https://cdn.cosmo.fans/x.mp4")).toBe(true);
  });

  test("an http URL is refused", () => {
    expect(acceptMediaUrl("http://resources.cosmo.fans/a.mp4")).toBe(false);
  });

  test("an unknown host is refused, including look-alikes", () => {
    expect(acceptMediaUrl("https://example.com/a.mp4")).toBe(false);
    expect(acceptMediaUrl("https://evilcosmo.fans/a.mp4")).toBe(false);
    expect(acceptMediaUrl("https://cosmo.fans.evil.com/a.mp4")).toBe(false);
    expect(acceptMediaUrl("https://resources.cosmo.fans@evil.com/a.mp4")).toBe(false);
  });

  test("a 1,024-character URL is accepted and a 1,025-character one refused", () => {
    const base = "https://resources.cosmo.fans/";
    expect(acceptMediaUrl(base + "a".repeat(1024 - base.length))).toBe(true);
    expect(acceptMediaUrl(base + "a".repeat(1025 - base.length))).toBe(false);
  });

  test("a string that is not a URL is refused", () => {
    expect(acceptMediaUrl("not a url")).toBe(false);
    expect(acceptMediaUrl("")).toBe(false);
  });
});

describe("mergeRecord", () => {
  test("a first report creates the record", () => {
    const { record, valuesChanged } = mergeRecord(null, { ...empty, frontMedia: motion }, now);
    expect(record).toMatchObject({ frontMedia: motion, observedAt: now, confirmedAt: now });
    expect(valuesChanged).toBe(true);
  });

  test("an empty field takes the first non-empty value", () => {
    const { record } = mergeRecord(stored(), { ...empty, bandImageUrl: band }, now);
    expect(record.bandImageUrl).toBe(band);
  });

  test("an empty or null value never clears one", () => {
    const { record, valuesChanged } = mergeRecord(
      stored({ frontMedia: motion, accentColor: "#112233" }),
      empty,
      now,
    );
    expect(record.frontMedia).toBe(motion);
    expect(record.accentColor).toBe("#112233");
    expect(valuesChanged).toBe(false);
  });

  test("a report whose fields all match sets confirmedAt", () => {
    const s = stored({ frontMedia: motion });
    const { record, valuesChanged } = mergeRecord(s, { ...empty, frontMedia: motion }, now);
    expect(record.confirmedAt).toBe(now);
    expect(record.observedAt).toBe(s.observedAt);
    expect(valuesChanged).toBe(false);
  });

  test("a report that fills a field sets confirmedAt and observedAt", () => {
    const { record } = mergeRecord(
      stored({ frontMedia: motion }),
      { ...empty, backImage: back },
      now,
    );
    expect(record.confirmedAt).toBe(now);
    expect(record.observedAt).toBe(now);
  });

  test("a different value is kept while confirmedAt is within 7 days", () => {
    const s = stored({ frontMedia: motion, confirmedAt: now - 7 * DAY });
    const { record, valuesChanged } = mergeRecord(s, { ...empty, frontMedia: motion2 }, now);
    expect(record.frontMedia).toBe(motion);
    expect(record.confirmedAt).toBe(s.confirmedAt);
    expect(valuesChanged).toBe(false);
  });

  test("a report with one matching and one not-yet-replaceable field does not confirm", () => {
    const s = stored({ frontMedia: motion, accentColor: "#112233", confirmedAt: now - 3 * DAY });
    const report = { ...empty, frontMedia: motion2, accentColor: "#112233" };
    const first = mergeRecord(s, report, now);
    expect(first.record.frontMedia).toBe(motion);
    expect(first.record.confirmedAt).toBe(s.confirmedAt);
    expect(first.valuesChanged).toBe(false);
    const later = mergeRecord(s, report, s.confirmedAt + 8 * DAY);
    expect(later.record.frontMedia).toBe(motion2);
    expect(later.record.confirmedAt).toBe(s.confirmedAt + 8 * DAY);
  });

  test("a value unconfirmed for 8 days is replaced", () => {
    const s = stored({ frontMedia: motion, confirmedAt: now - 8 * DAY });
    const { record, valuesChanged } = mergeRecord(s, { ...empty, frontMedia: motion2 }, now);
    expect(record.frontMedia).toBe(motion2);
    expect(record.confirmedAt).toBe(now);
    expect(valuesChanged).toBe(true);
  });

  test("a differing report right after a replace leaves the new value", () => {
    const s = stored({ frontMedia: motion, confirmedAt: now - 8 * DAY });
    const first = mergeRecord(s, { ...empty, frontMedia: motion2 }, now).record;
    const second = mergeRecord(first, { ...empty, frontMedia: motion }, now + 1000).record;
    expect(second.frontMedia).toBe(motion2);
  });

  test("two sessions alternating different values leave the record", () => {
    let rec = stored({ frontMedia: motion, confirmedAt: now - DAY });
    let t = now;
    for (let i = 0; i < 6; i++) {
      t += 3 * DAY;
      const seen = i % 2 === 0 ? motion : motion2;
      rec = mergeRecord(rec, { ...empty, frontMedia: seen }, t).record;
    }
    // the holder of `motion` reports every 6 days, so the value never goes 7 days unconfirmed
    expect(rec.frontMedia).toBe(motion);
  });

  test("hasVoice false never clears true, true fills false", () => {
    expect(mergeRecord(stored({ hasVoice: true }), empty, now).record.hasVoice).toBe(true);
    expect(mergeRecord(stored(), { ...empty, hasVoice: true }, now).record.hasVoice).toBe(true);
  });
});

describe("acceptCopyUrl", () => {
  test("a URL under the prefix, at most 255 characters", () => {
    expect(acceptCopyUrl(`${prefix}motion/a.mp4`, prefix)).toBe(true);
    expect(acceptCopyUrl(prefix + "a".repeat(255 - prefix.length), prefix)).toBe(true);
    expect(acceptCopyUrl(prefix + "a".repeat(256 - prefix.length), prefix)).toBe(false);
  });

  test("a URL outside the prefix is refused, including a look-alike host", () => {
    expect(acceptCopyUrl(motion, prefix)).toBe(false);
    expect(acceptCopyUrl("https://cdn.example.com/collection-images/a.mp4", prefix)).toBe(false);
    expect(acceptCopyUrl("https://cdn.example.com.evil.net/collection-media/a.mp4", prefix)).toBe(
      false,
    );
    expect(acceptCopyUrl("", prefix)).toBe(false);
  });
});

describe("planMediaWrite", () => {
  const row = {
    frontMedia: null as string | null,
    bandImageUrl: null as string | null,
    hasAudio: false,
    backImage: "",
    accentColor: "",
    textColor: "#000000",
    sourceTextColor: null as string | null,
  };
  const rec = (over: Partial<MediaRecord & MediaCopies> = {}): MediaRecord & MediaCopies => ({
    ...empty,
    frontMediaCopy: null,
    ...over,
  });
  const plan = (r: MediaRecord & MediaCopies, budget = 5, over: Partial<typeof row> = {}) =>
    planMediaWrite({ ...row, ...over }, r, budget, prefix);

  test("front_media: our copy is written when it differs", () => {
    expect(plan(rec({ frontMedia: motion, frontMediaCopy: copy })).set).toEqual({
      frontMedia: copy,
    });
    expect(plan(rec({ frontMediaCopy: copy }), 5, { frontMedia: copy }).set).toEqual({});
    expect(plan(rec({ frontMediaCopy: copy2 }), 5, { frontMedia: copy }).set).toEqual({
      frontMedia: copy2,
    });
  });

  test("front_media: Cosmo's URL with no copy writes nothing", () => {
    expect(plan(rec({ frontMedia: motion })).set).toEqual({});
    expect(plan(rec({ frontMedia: motion }), 5, { frontMedia: copy }).set).toEqual({});
  });

  test("front_media: a copy outside the prefix or over 255 characters writes nothing", () => {
    expect(plan(rec({ frontMediaCopy: motion })).set).toEqual({});
    expect(
      plan(rec({ frontMediaCopy: "https://evil.example/collection-media/a.mp4" })).set,
    ).toEqual({});
    const long = prefix + "a".repeat(256 - prefix.length);
    expect(plan(rec({ frontMediaCopy: long })).set).toEqual({});
  });

  test("band_image_url is never written, whatever the record holds", () => {
    expect(plan(rec({ bandImageUrl: band })).set).toEqual({});
    expect(plan(rec({ bandImageUrl: band }), 5, { bandImageUrl: "https://x/old" }).set).toEqual({});
  });

  test("has_audio: only from false to true", () => {
    expect(plan(rec({ hasVoice: true })).set).toEqual({ hasAudio: true });
    expect(plan(rec({ hasVoice: true }), 5, { hasAudio: true }).set).toEqual({});
    expect(plan(rec({ hasVoice: false }), 5, { hasAudio: true }).set).toEqual({});
  });

  test("back_image: only when the row's is empty, and the budget goes down by one", () => {
    expect(plan(rec({ backImage: back }))).toEqual({
      set: { backImage: back },
      backImageBudget: 4,
    });
    expect(plan(rec({ backImage: back }), 5, { backImage: "https://x/old" })).toEqual({
      set: {},
      backImageBudget: 5,
    });
  });

  test("back_image: a URL that fails acceptMediaUrl is never written", () => {
    expect(plan(rec({ backImage: "http://imagedelivery.net/h/b" })).set).toEqual({});
    expect(plan(rec({ backImage: "https://evil.example/b.png" })).set).toEqual({});
  });

  test("back_image: a budget of 0 writes none", () => {
    expect(plan(rec({ backImage: back }), 0)).toEqual({
      set: {},
      backImageBudget: 0,
    });
  });

  test("accent_color: only when the row's is empty", () => {
    expect(plan(rec({ accentColor: "#112233" })).set).toEqual({
      accentColor: "#112233",
    });
    expect(plan(rec({ accentColor: "#112233" }), 5, { accentColor: "#445566" }).set).toEqual({});
  });

  test("text_color: written while source_text_color is null and it differs", () => {
    expect(plan(rec({ textColor: "#ffffff" })).set).toEqual({
      textColor: "#ffffff",
    });
    expect(plan(rec({ textColor: "#000000" })).set).toEqual({});
  });

  test("text_color: a staff override (source_text_color set) is never touched", () => {
    const staff = { ...row, textColor: "#abcdef", sourceTextColor: "#111111" };
    expect(plan(rec({ textColor: "#ffffff" }), 5, staff).set).toEqual({});
  });

  test("source_text_color and background_color are never written", () => {
    const { set } = plan(rec({ textColor: "#ffffff", accentColor: "#112233" }));
    expect(Object.keys(set)).not.toContain("sourceTextColor");
    expect(Object.keys(set)).not.toContain("backgroundColor");
  });

  test("a malformed colour in the record writes nothing", () => {
    expect(plan(rec({ textColor: "white", accentColor: "#12" })).set).toEqual({});
  });
});

describe("mediaKind", () => {
  test("mp4 and webm copies are video", () => {
    expect(mediaKind(`${prefix}motion/aaaa.mp4`)).toBe("video");
    expect(mediaKind(`${prefix}motion/aaaa.webm`)).toBe("video");
  });

  test("m4a, mp3 and ogg copies are audio, never video", () => {
    expect(mediaKind(`${prefix}motion/aaaa.m4a`)).toBe("audio");
    expect(mediaKind(`${prefix}motion/aaaa.mp3`)).toBe("audio");
    expect(mediaKind(`${prefix}motion/aaaa.ogg`)).toBe("audio");
  });

  test("the extension is read from the path, not the query, and in any case", () => {
    expect(mediaKind("https://cdn.example.com/a.MP4?x=.m4a")).toBe("video");
    expect(mediaKind("https://cdn.example.com/a.mp3#.mp4")).toBe("audio");
  });

  test("anything else is null", () => {
    expect(mediaKind("https://cdn.example.com/a.png")).toBeNull();
    expect(mediaKind("https://cdn.example.com/mp4")).toBeNull();
    expect(mediaKind("not a url")).toBeNull();
    expect(mediaKind(null)).toBeNull();
  });
});
