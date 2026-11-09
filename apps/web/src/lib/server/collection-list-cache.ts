import { promisify } from "node:util";
import { brotliCompress, constants, gzip } from "node:zlib";

import { fetchCollectionList } from "@repo/api/services/objekt/collection";

import { type Encoding, jsonEncoding, listCacheKey } from "./collection-list-cache-rules";

// an edit that leaves Last-Modified alone (an indexer upsert) already waits for the list service's
// own five-minute rebuild; this adds at most a minute to that
const MAX_AGE_MS = 60_000;
const COMPRESSION_ON = (process.env.ASSET_PRELOAD_ENABLE_GZIP ?? "true") === "true";

// the async forms run on zlib's thread pool, as `bun-server/compress.ts` does: compressing the
// 10 MB list on the main thread would block it for tens of milliseconds
const brotli = promisify(brotliCompress);
const gzipAsync = promisify(gzip);

type Entry = {
  lastModifiedMs: number;
  storedAt: number;
  headers: [string, string][];
  bodies: Record<Encoding, Uint8Array<ArrayBuffer>>;
};

/** A copy per shape, or the rebuild that will produce it; a request that sees one waits for it. */
const slots = new Map<string, Promise<Entry | null>>();

/** The handler's list with every encoding made, or `null` when its response can't be cached. */
async function build(response: Response): Promise<Entry | null> {
  const lastModified = response.headers.get("last-modified");
  if (response.status !== 200 || !lastModified || response.headers.has("content-encoding")) {
    return null;
  }
  const raw = new Uint8Array(await response.arrayBuffer());
  const [br, gz] = await Promise.all([
    // the quality `bun-server/compress.ts` uses
    brotli(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }),
    gzipAsync(raw),
  ]);
  return {
    lastModifiedMs: new Date(lastModified).getTime(),
    storedAt: Date.now(),
    headers: [...response.headers].filter(([name]) => name !== "content-length"),
    bodies: { identity: raw, br: new Uint8Array(br), gzip: new Uint8Array(gz) },
  };
}

function respond(entry: Entry, encoding: Encoding): Response {
  const body = entry.bodies[encoding];
  const headers = new Headers(entry.headers);
  headers.set("Content-Length", String(body.byteLength));
  headers.append("Vary", "Accept-Encoding");
  if (encoding !== "identity") headers.set("Content-Encoding", encoding);
  return new Response(body, { status: 200, headers });
}

/** Whether a stored copy can still be served: young enough, and nothing changed since it. */
async function isCurrent(entry: Entry): Promise<boolean> {
  if (Date.now() - entry.storedAt >= MAX_AGE_MS) return false;
  // the check reads `collection:modified-at` fail-open, so during a Valkey outage a staff bump
  // waits out the entry's age; a failed indexer read rebuilds instead
  const current = await fetchCollectionList({ artist: [] }, entry.lastModifiedMs).catch(() => null);
  return current?.notModified ?? false;
}

/**
 * The unfiltered collection list, kept serialized and compressed until it changes: every profile
 * page fetches it, and building and compressing its 10 MB of JSON cost about 90 ms of CPU a
 * request. Each hit asks the list service whether anything changed since the stored copy's
 * Last-Modified, the question a browser's If-Modified-Since asks, so a new collection or a staff
 * bump shows on the next request. Any other request goes straight to `handle`.
 */
export async function cachedCollectionList(
  request: Request,
  handle: () => Promise<Response>,
): Promise<Response> {
  const key = request.method === "GET" ? listCacheKey(new URL(request.url), request.headers) : null;
  if (key === null) return handle();
  const encoding = jsonEncoding(request.headers.get("accept-encoding"), COMPRESSION_ON);

  const seen = slots.get(key);
  const entry = await seen?.catch(() => null);
  if (entry && (await isCurrent(entry))) return respond(entry, encoding);

  // replace only the slot this request judged: one that moved on is a rebuild already started
  const moved = slots.get(key);
  if (moved && moved !== seen) {
    const built = await moved.catch(() => null);
    return built ? respond(built, encoding) : handle();
  }

  // an uncacheable response is left unread, so the request that made it can still send it
  let unread: Response | undefined;
  const slot = handle().then(async (response) => {
    const built = await build(response);
    if (!built) unread = response;
    return built;
  });
  slots.set(key, slot);
  const built = await slot.catch(() => null);
  if (!built && slots.get(key) === slot) slots.delete(key);
  return built ? respond(built, encoding) : (unread ?? handle());
}
