/**
 * Pulls the public collection catalogue from objekt.top and writes a curated
 * sample to `src/fixtures/collections.json`.
 *
 * The full catalogue is ~15.5k rows / ~14 MB, far too much to keep in a lab
 * fixture, so the sample is: the 40 newest collections per artist, plus the
 * newest collection of every (season, class) pair that those 120 missed, so
 * every season and every class is represented at least once.
 *
 * Run once with: bun scripts/fetch-collections.ts
 */
const ENDPOINT = "https://objekt.top/api/collection";
const OUT = new URL("../src/fixtures/collections.json", import.meta.url);
const NEWEST_PER_ARTIST = 40;
/** the coverage passes land around 140 rows; top up so the grids have some depth */
const TARGET_ROWS = 180;

/** raw row shape, only the fields the lab keeps */
type Collection = {
  slug: string;
  collectionId: string;
  season: string;
  member: string;
  artist: string;
  collectionNo: string;
  class: string;
  thumbnailImage: string;
  frontImage: string;
  backImage: string;
  backgroundColor: string;
  textColor: string;
  onOffline: string;
  createdAt: string;
};

/** the API sends more fields than the lab keeps, and `backImage` can be absent */
type RawCollection = Omit<Collection, "backImage"> & { backImage?: string };

function pick(row: RawCollection): Collection {
  return {
    slug: row.slug,
    collectionId: row.collectionId,
    season: row.season,
    member: row.member,
    artist: row.artist,
    collectionNo: row.collectionNo,
    class: row.class,
    thumbnailImage: row.thumbnailImage,
    frontImage: row.frontImage,
    backImage: row.backImage ?? "",
    backgroundColor: row.backgroundColor,
    textColor: row.textColor,
    onOffline: row.onOffline,
    createdAt: row.createdAt,
  };
}

const response = await fetch(ENDPOINT);
if (!response.ok) throw new Error(`${ENDPOINT} responded ${response.status}`);

const body = (await response.json()) as { collections: RawCollection[] };
const all = body.collections
  .map(pick)
  // the API already orders newest first, but do not rely on it
  .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
  .filter((c) => c.thumbnailImage !== "" && c.frontImage !== "");

const picked = new Map<string, Collection>();
const perArtist = new Map<string, number>();

for (const c of all) {
  const taken = perArtist.get(c.artist) ?? 0;
  if (taken >= NEWEST_PER_ARTIST) continue;
  perArtist.set(c.artist, taken + 1);
  picked.set(c.slug, c);
}

// backfill every season and every class that the newest slice missed
const covered = (key: string, values: Iterable<Collection>) =>
  new Set([...values].map((c) => (key === "season" ? c.season : c.class)));

for (const key of ["season", "class"] as const) {
  const seen = covered(key, picked.values());
  for (const c of all) {
    if (seen.has(c[key])) continue;
    seen.add(c[key]);
    picked.set(c.slug, c);
  }
}

// one more pass so every (artist, season) pair has at least one row — the
// artist segmented control looks broken when a tab has a single season
const pairs = new Set([...picked.values()].map((c) => `${c.artist}/${c.season}`));
for (const c of all) {
  const pair = `${c.artist}/${c.season}`;
  if (pairs.has(pair)) continue;
  pairs.add(pair);
  picked.set(c.slug, c);
}

// top up round-robin across artists so no single artist dominates the tail
const queues = new Map<string, Collection[]>();
for (const c of all) {
  if (picked.has(c.slug)) continue;
  const queue = queues.get(c.artist) ?? [];
  queue.push(c);
  queues.set(c.artist, queue);
}
while (picked.size < TARGET_ROWS) {
  const next = [...queues.values()].map((queue) => queue.shift()).filter((c) => c !== undefined);
  if (next.length === 0) break;
  for (const c of next) {
    if (picked.size >= TARGET_ROWS) break;
    picked.set(c.slug, c);
  }
}

const rows = [...picked.values()].toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));

await Bun.write(OUT, `${JSON.stringify(rows, null, 2)}\n`);

const count = (fn: (c: Collection) => string) => [...new Set(rows.map(fn))].toSorted().join(", ");

console.log(`fetched ${all.length} collections, wrote ${rows.length} to ${OUT.pathname}`);
console.log(`artists: ${count((c) => c.artist)}`);
console.log(`seasons: ${count((c) => c.season)}`);
console.log(`classes: ${count((c) => c.class)}`);
