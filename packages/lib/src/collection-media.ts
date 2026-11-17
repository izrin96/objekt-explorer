import { slugifyObjekt } from "./index";

const DAY = 86_400_000;
/** A stored value that no session confirmed for longer than this may be replaced. */
const REPLACE_AFTER_MS = 7 * DAY;
const MAX_URL_LENGTH = 1024; // the record's varchar(1024) source columns, not the indexer's 255
const MAX_COPY_LENGTH = 255; // the indexer's front_media varchar(255)
const COLOUR = /^#[0-9a-f]{6}$/;

const ALLOWED_HOSTS = new Set(["imagedelivery.net", "resources.cosmo.fans"]);

/** What one session reported about one collection; null is "nothing". */
export type MediaRecord = {
  frontMedia: string | null;
  bandImageUrl: string | null;
  hasVoice: boolean;
  backImage: string | null;
  accentColor: string | null;
  textColor: string | null;
};

/** The stored record: `observedAt` is the last change, `confirmedAt` the last time a session agreed. */
export type StoredMedia = MediaRecord & { observedAt: number; confirmedAt: number };

/** The shape of `SummaryCollection` in `@repo/cosmo`, without depending on it. */
export type ObservedCollection = {
  collectionId: string;
  frontMedia: string | null;
  bandImageUrl: string | null;
  hasVoice: boolean;
  backImage: string | null;
  accentColor: string | null;
  textColor: string | null;
};

/** The indexer columns the apply reads. `backImage` and `accentColor` are `""` on a v3 row. */
export type MediaRow = {
  frontMedia: string | null;
  bandImageUrl: string | null;
  hasAudio: boolean;
  backImage: string;
  accentColor: string;
  textColor: string;
  sourceTextColor: string | null;
};

/** Our copies of a record's media, kept beside it; the merge never sees them. */
export type MediaCopies = { frontMediaCopy: string | null };

/** `bandImageUrl` is absent on purpose: the apply never writes it (Band images). */
export type MediaWrite = Partial<
  Pick<MediaRow, "frontMedia" | "hasAudio" | "backImage" | "accentColor" | "textColor">
>;

const URL_FIELDS = ["frontMedia", "bandImageUrl", "backImage"] as const;

/** https, no credentials or port, one of the two exact hosts in `ALLOWED_HOSTS`, `MAX_URL_LENGTH` (1,024) characters at most. */
export function acceptMediaUrl(url: string) {
  if (url.length === 0 || url.length > MAX_URL_LENGTH) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password || parsed.port) return false;
  return ALLOWED_HOSTS.has(parsed.hostname);
}

/** Our copy's URL: under `copyPrefix` and short enough for the indexer's `front_media`. */
export function acceptCopyUrl(url: string, copyPrefix: string) {
  return url.length <= MAX_COPY_LENGTH && url.startsWith(copyPrefix);
}

const VIDEO_EXTS = new Set(["mp4", "webm"]);
const AUDIO_EXTS = new Set(["m4a", "mp3", "ogg"]);

/**
 * What our copy of `front_media` is, by the extension of its path (the copy job names a file for
 * the type it sniffed): a voice collection's audio must never reach a `<video>`.
 */
export function mediaKind(url: string | null) {
  if (!url) return null;
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return null;
  }
  const ext = path.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? "";
  if (VIDEO_EXTS.has(ext)) return "video" as const;
  if (AUDIO_EXTS.has(ext)) return "audio" as const;
  return null;
}

function cleanUrl(value: string | null) {
  return value && acceptMediaUrl(value) ? value : null;
}

function cleanColour(value: string | null) {
  const lower = value?.toLowerCase() ?? "";
  return COLOUR.test(lower) ? lower : null;
}

/** Hosts of the reported URLs `acceptMediaUrl` refuses, for a warn that names the host and never the URL. */
export function rejectedHosts(collections: readonly ObservedCollection[]) {
  const hosts = new Set<string>();
  for (const c of collections) {
    for (const field of URL_FIELDS) {
      const value = c[field];
      if (!value || acceptMediaUrl(value)) continue;
      try {
        hosts.add(new URL(value).hostname);
      } catch {
        hosts.add("invalid");
      }
    }
  }
  return [...hosts];
}

/**
 * One record per collection a page reported, keyed by `slugifyObjekt(collectionId)`, with a URL
 * that fails `acceptMediaUrl` or a colour that is not `#rrggbb` left out. A collection that reports
 * nothing usable gets no record.
 */
export function observe(collections: readonly ObservedCollection[]) {
  const records = new Map<string, MediaRecord>();
  for (const c of collections) {
    const next: MediaRecord = {
      frontMedia: cleanUrl(c.frontMedia),
      bandImageUrl: cleanUrl(c.bandImageUrl),
      hasVoice: c.hasVoice,
      backImage: cleanUrl(c.backImage),
      accentColor: cleanColour(c.accentColor),
      textColor: cleanColour(c.textColor),
    };
    if (!hasValue(next)) continue;
    const slug = slugifyObjekt(c.collectionId);
    const seen = records.get(slug);
    records.set(
      slug,
      seen
        ? {
            frontMedia: seen.frontMedia ?? next.frontMedia,
            bandImageUrl: seen.bandImageUrl ?? next.bandImageUrl,
            hasVoice: seen.hasVoice || next.hasVoice,
            backImage: seen.backImage ?? next.backImage,
            accentColor: seen.accentColor ?? next.accentColor,
            textColor: seen.textColor ?? next.textColor,
          }
        : next,
    );
  }
  return records;
}

function hasValue(r: MediaRecord) {
  return (
    r.hasVoice ||
    r.frontMedia !== null ||
    r.bandImageUrl !== null ||
    r.backImage !== null ||
    r.accentColor !== null ||
    r.textColor !== null
  );
}

const STRING_FIELDS = [
  "frontMedia",
  "bandImageUrl",
  "backImage",
  "accentColor",
  "textColor",
] as const;

/**
 * Folds one session's report into the stored record. Collection fields are the same for every
 * holder, so a disagreement is a Cosmo change or noise: "latest wins" would flip a value every time
 * two sessions alternate. An empty report value never clears; a different value replaces only when
 * no session confirmed the stored one for 7 days; `hasVoice` false counts as empty. A report
 * refreshes `confirmedAt` only when none of its fields disagrees with a stored value it could not replace.
 * `valuesChanged` says whether a value changed; the caller compares `confirmedAt` for the rest.
 */
export function mergeRecord(stored: StoredMedia | null, observed: MediaRecord, now: number) {
  const base: StoredMedia = stored ?? {
    frontMedia: null,
    bandImageUrl: null,
    hasVoice: false,
    backImage: null,
    accentColor: null,
    textColor: null,
    observedAt: now,
    confirmedAt: now,
  };
  const next: StoredMedia = { ...base };
  const stale = now - base.confirmedAt > REPLACE_AFTER_MS;
  let valuesChanged = false;
  let confirms = false;
  let disagrees = false;
  let reportedAny = false;

  for (const field of STRING_FIELDS) {
    const seen = observed[field];
    if (seen === null || seen === "") continue;
    reportedAny = true;
    const held = base[field];
    if (held === null || held === "") {
      next[field] = seen;
      valuesChanged = confirms = true;
    } else if (held === seen) {
      confirms = true;
    } else if (stale) {
      next[field] = seen;
      valuesChanged = confirms = true;
    } else disagrees = true; // a fresh stored value stays, and a report that disagrees confirms nothing
  }
  if (observed.hasVoice) {
    reportedAny = true;
    if (base.hasVoice) confirms = true;
    else {
      next.hasVoice = true;
      valuesChanged = confirms = true;
    }
  }

  if (confirms && reportedAny && !disagrees) next.confirmedAt = now;
  if (valuesChanged) next.observedAt = now;
  return { record: next, valuesChanged };
}

/**
 * The columns to write on an indexer row, and the back image budget left. `front_media` takes only
 * our copy (`frontMediaCopy`, under `copyPrefix`), never Cosmo's URL: a signed URL would show which
 * account shared the collection. `band_image_url` is never written, since the web's hardcoded band
 * images sit behind it. A v3 row has `""` for a back image and an accent colour, so those are only
 * ever filled. `text_color` is Cosmo's only while no staff override holds (`sourceTextColor` is
 * null). `source_text_color` and `background_color` are never written.
 */
export function planMediaWrite(
  row: MediaRow,
  record: MediaRecord & MediaCopies,
  budget: number,
  copyPrefix: string,
) {
  const set: MediaWrite = {};
  let backImageBudget = budget;

  const copy = record.frontMediaCopy;
  if (copy && acceptCopyUrl(copy, copyPrefix) && copy !== row.frontMedia) set.frontMedia = copy;
  if (record.hasVoice && !row.hasAudio) set.hasAudio = true;
  if (
    row.backImage === "" &&
    record.backImage &&
    acceptMediaUrl(record.backImage) &&
    backImageBudget > 0
  ) {
    set.backImage = record.backImage;
    backImageBudget -= 1;
  }
  const accent = cleanColour(record.accentColor);
  if (row.accentColor === "" && accent) set.accentColor = accent;
  const text = cleanColour(record.textColor);
  if (row.sourceTextColor === null && text && text !== row.textColor) set.textColor = text;

  return { set, backImageBudget };
}
