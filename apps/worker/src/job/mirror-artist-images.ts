import { ARTIST_IMAGES_KEY, ARTISTS_CACHE_KEY, artistImageSources } from "@repo/lib/artist-images";
import { ofetch } from "ofetch";

import { log } from "@/lib/log";
import { redis } from "@/lib/redis";
import { objectUrl, putWebp } from "@/lib/s3";

const FOLDER = "artist-images";
// part of every key: bump it when the encoding below changes, and the next recheck redoes them all
const VERSION = "v1";
// shown at 20–22 CSS px (member chips, artist avatar), so 128 covers a 3x screen with room
const MAX_SIDE = 128;
// a logo sits at a fixed Cosmo path whose bytes can change, so every source is fetched again
// this often; between rechecks only images with no copy yet are fetched
const RECHECK_MS = 24 * 60 * 60 * 1000;
const CHECKED_AT_KEY = `${ARTIST_IMAGES_KEY}:checked-at`;
const imagesLog = log("artist-images");

type Stored = {
  value: Parameters<typeof artistImageSources>[0];
};

/**
 * Copies every member avatar and artist logo the artist list shows into the bucket as a small
 * WebP and records it in the `artist-images` hash, which the API applies on its next refresh.
 * Reads the list the API stored (`getStaleCache` keeps it under `<key>:last-good`), so the worker
 * needs no Cosmo call of its own.
 */
export async function mirrorArtistImages() {
  const json = await redis.get(`${ARTISTS_CACHE_KEY}:last-good`);
  if (!json) return;
  const { value } = JSON.parse(json) as Stored;

  const mirrored = await redis.hgetall(ARTIST_IMAGES_KEY);
  const checkedAt = Number((await redis.get(CHECKED_AT_KEY)) ?? 0);
  const recheck = Date.now() - checkedAt >= RECHECK_MS;
  const sources = artistImageSources(value, mirrored, objectUrl(""));
  const pending = recheck ? sources : sources.filter((url) => !(url in mirrored));
  if (pending.length === 0) return;

  let copied = 0;
  const failed: string[] = [];
  for (const source of pending) {
    try {
      const buffer = await ofetch(source, { responseType: "arrayBuffer", timeout: 30_000 });
      // named by the bytes, so a key's object never changes under its immutable Cache-Control
      const key = `${FOLDER}/${VERSION}-${hashOf(buffer)}.webp`;
      if (mirrored[source] === objectUrl(key)) continue;
      await putWebp(key, await toSmallWebp(buffer));
      await redis.hset(ARTIST_IMAGES_KEY, { [source]: objectUrl(key) });
      copied++;
    } catch (error) {
      imagesLog.debug(`Failed for ${source}:`, error);
      failed.push(source);
    }
  }
  if (recheck) await redis.set(CHECKED_AT_KEY, String(Date.now()));

  if (copied > 0) imagesLog.info(`Mirrored ${copied} artist images`);
  // retried on the next run, so it is drift, not a failed job
  if (failed.length > 0) imagesLog.warn(`${failed.length} artist images failed, e.g. ${failed[0]}`);
}

function hashOf(bytes: ArrayBuffer) {
  return new Bun.CryptoHasher("sha256").update(bytes).digest("hex").slice(0, 16);
}

async function toSmallWebp(source: ArrayBuffer) {
  const img = new Bun.Image(Buffer.from(source));
  const { width, height } = await img.metadata();
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  return await img
    .resize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)))
    .webp({ quality: 80 })
    .toBuffer();
}
