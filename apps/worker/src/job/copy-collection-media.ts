import { lookup } from "node:dns/promises";

import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { collectionMedia } from "@repo/db/schema";
import { chunk } from "@repo/lib";
import { acceptMediaUrl } from "@repo/lib/collection-media";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { errorCode } from "@/lib/error-code";
import { log } from "@/lib/log";
import {
  type CopyFailure,
  copyKey,
  createCopyBudget,
  dueCopies,
  failureForStatus,
  isPublicAddress,
  MAX_BYTES,
  sniffVideo,
} from "@/lib/media-copy";
import { mediaStorageConfigured, objectUrl, putObject } from "@/lib/s3";

const copyLog = log("media-copy");

const FETCH_TIMEOUT_MS = 60_000;
const SLUG_CHUNK = 500;

let warnedUnconfigured = false;

class CopyFailed extends Error {
  constructor(
    readonly reason: string,
    readonly kind: CopyFailure,
    readonly host: string,
    readonly bytesRead = 0,
  ) {
    super(reason);
  }
}

/** Every address the host resolves to must be public, so a stray record never reaches our network. */
async function assertPublicHost(host: string) {
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new CopyFailed("dns", "other", host);
  }
  if (addresses.length === 0 || !addresses.every((a) => isPublicAddress(a.address))) {
    throw new CopyFailed("non_public_address", "other", host);
  }
}

/** Reads the body as a stream, aborting past the cap since `Content-Length` may be absent or wrong. */
async function readCapped(response: Response, host: string, signal: AbortSignal) {
  const body = response.body;
  if (!body) throw new CopyFailed("empty", "other", host);
  const reader = body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new CopyFailed("too_large", "other", host, size);
      }
      parts.push(value);
    }
  } catch (error) {
    if (error instanceof CopyFailed) throw error;
    throw new CopyFailed(
      signal.aborted ? "timeout" : "read",
      signal.aborted ? "timeout" : "other",
      host,
      size,
    );
  }
  return Buffer.concat(parts);
}

/** Downloads one source and puts it in the bucket; returns the stored URL and the bytes. */
async function copyOne(source: string) {
  if (!acceptMediaUrl(source)) throw new CopyFailed("rejected", "other", "unknown");
  const host = new URL(source).hostname;
  await assertPublicHost(host);

  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    // a plain public GET: no cookie, no Cosmo header, and a redirect is a failure, not followed
    response = await fetch(source, { redirect: "manual", signal });
  } catch {
    throw new CopyFailed(
      signal.aborted ? "timeout" : "network",
      signal.aborted ? "timeout" : "other",
      host,
    );
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    const { reason, kind } = failureForStatus(response.status);
    throw new CopyFailed(reason, kind, host);
  }
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new CopyFailed("too_large", "other", host);
  }

  const bytes = await readCapped(response, host, signal);
  const media = sniffVideo(bytes);
  if (!media) throw new CopyFailed("not_media", "other", host, bytes.length);

  const key = copyKey(source, media.ext);
  try {
    await putObject(key, bytes, media.contentType);
  } catch {
    throw new CopyFailed("upload", "other", host, bytes.length);
  }
  return { url: objectUrl(key), size: bytes.length };
}

/** Sets the copy on every record still holding `source`; a merge that replaced it is not overwritten. */
async function recordCopy(source: string, url: string, slugs: string[]) {
  await db
    .update(collectionMedia)
    .set({ frontMediaCopy: url, frontMediaFailedAt: null })
    .where(and(inArray(collectionMedia.slug, slugs), eq(collectionMedia.frontMedia, source)));
}

async function indexerSlugsOf(slugs: string[]) {
  const found = new Set<string>();
  await chunk(slugs, SLUG_CHUNK, async (part) => {
    const rows = await indexer
      .select({ slug: collections.slug })
      .from(collections)
      .where(inArray(collections.slug, part));
    for (const row of rows) found.add(row.slug);
  });
  return found;
}

/**
 * Copies each recorded motion or voice file into the bucket and records our URL beside the
 * record (Decision 9). Writes the bucket and `collection_media` only: the apply in
 * `collection-media` stays the one writer of the indexer, and nothing here deletes an object.
 */
export async function copyCollectionMedia() {
  try {
    await runCopy();
  } catch (error) {
    // by code only: a driver error's message carries the query's parameters
    copyLog.error(`Copy failed: ${errorCode(error)}`);
  }
}

async function runCopy() {
  if (!mediaStorageConfigured()) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      copyLog.warn("S3_BUCKET or S3_PUBLIC_URL is not set; collection media copy is off");
    }
    return;
  }

  // epoch milliseconds, since the driver's timestamptz strings are not a format `Date` promises to read
  const epochMs = (column: unknown) => sql<number>`(extract(epoch from ${column}) * 1000)::float8`;
  const records = await db
    .select({
      slug: collectionMedia.slug,
      frontMedia: collectionMedia.frontMedia,
      frontMediaCopy: collectionMedia.frontMediaCopy,
      frontMediaFailedAt: epochMs(collectionMedia.frontMediaFailedAt).mapWith(Number),
      observedAt: epochMs(collectionMedia.observedAt).mapWith(Number),
    })
    .from(collectionMedia)
    .where(isNotNull(collectionMedia.frontMedia));
  if (records.length === 0) return;

  const startedAt = Date.now();
  const { downloads, reuses } = dueCopies(
    records,
    await indexerSlugsOf(records.map((r) => r.slug)),
    startedAt,
    objectUrl("collection-media/"),
  );
  if (downloads.length === 0 && reuses.length === 0) return;

  for (const reuse of reuses) await recordCopy(reuse.source, reuse.copyUrl, reuse.slugs);

  const budget = createCopyBudget(startedAt);
  const failures = new Map<string, number>();
  let copied = 0;
  for (const download of downloads) {
    if (!budget.canStart(Date.now())) break;
    try {
      const { url, size } = await copyOne(download.source);
      budget.success(size);
      await recordCopy(download.source, url, download.slugs);
      copied += 1;
    } catch (error) {
      const failed =
        error instanceof CopyFailed ? error : new CopyFailed("error", "other", "unknown");
      budget.failure(failed.kind, failed.bytesRead);
      // one failure marks every record with this source, not only the due ones
      await db
        .update(collectionMedia)
        .set({ frontMediaFailedAt: new Date().toISOString() })
        .where(eq(collectionMedia.frontMedia, download.source))
        .catch(() => undefined);
      const label = `${failed.reason}@${failed.host}`;
      failures.set(label, (failures.get(label) ?? 0) + 1);
    }
  }

  const failedCount = [...failures.values()].reduce((a, b) => a + b, 0);
  if (copied > 0 || reuses.length > 0) {
    const mb = (budget.used.bytes / (1024 * 1024)).toFixed(1);
    copyLog.info(`Copied ${copied} files (${mb} MB), reused ${reuses.length}`);
  }
  if (failedCount > 0) {
    const by = [...failures].map(([label, n]) => `${label} ${n}`).join(", ");
    copyLog.warn(`${failedCount} copies failed, retried after 6 hours: ${by}`);
  }
}
