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
  status: number;
  headers: [string, string][];
  /** one compression per encoding, shared by the requests that arrive while it runs */
  bodies: Partial<Record<Encoding, Promise<Uint8Array<ArrayBuffer>>>>;
};

/** A rebuild's outcome: the entry, or the handler's response when it can't be cached. */
type Built = { entry: Entry } | { response: Response };

const entries = new Map<string, Entry>();
const building = new Map<string, Promise<Built>>();

async function encode(raw: Uint8Array<ArrayBuffer>, encoding: Encoding) {
  if (encoding === "br") {
    // the quality `bun-server/compress.ts` uses
    const out = await brotli(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } });
    return new Uint8Array(out);
  }
  if (encoding === "gzip") return new Uint8Array(await gzipAsync(raw));
  return raw;
}

async function respond(entry: Entry, encoding: Encoding): Promise<Response> {
  const body = await (entry.bodies[encoding] ??= entry.bodies.identity!.then((raw) =>
    encode(raw, encoding),
  ));
  const headers = new Headers(entry.headers);
  headers.set("Content-Length", String(body.byteLength));
  headers.append("Vary", "Accept-Encoding");
  if (encoding !== "identity") headers.set("Content-Encoding", encoding);
  return new Response(body, { status: entry.status, headers });
}

async function build(key: string, handle: () => Promise<Response>): Promise<Built> {
  const response = await handle();
  const lastModified = response.headers.get("last-modified");
  if (response.status !== 200 || !lastModified || response.headers.has("content-encoding")) {
    return { response };
  }
  const entry: Entry = {
    lastModifiedMs: new Date(lastModified).getTime(),
    storedAt: Date.now(),
    status: response.status,
    headers: [...response.headers].filter(([name]) => name !== "content-length"),
    bodies: { identity: response.arrayBuffer().then((buffer) => new Uint8Array(buffer)) },
  };
  entries.set(key, entry);
  void entry.bodies.identity!.catch(() => {
    if (entries.get(key) === entry) entries.delete(key);
  });
  return { entry };
}

/**
 * The unfiltered collection list, kept serialized and compressed until it changes: every profile
 * page fetches it, and building and compressing its 10 MB of JSON cost about 90 ms of CPU a
 * request. Each hit asks the list service whether anything changed since the stored copy's
 * Last-Modified, the question a browser's If-Modified-Since asks, so a new collection or a staff
 * bump shows on the next request. `null` when the request is not one it serves.
 */
export async function cachedCollectionList(
  request: Request,
  handle: () => Promise<Response>,
): Promise<Response | null> {
  if (request.method !== "GET") return null;
  const key = listCacheKey(new URL(request.url), request.headers);
  if (key === null) return null;
  const encoding = jsonEncoding(request.headers.get("accept-encoding"), COMPRESSION_ON);

  const entry = entries.get(key);
  if (entry && Date.now() - entry.storedAt < MAX_AGE_MS) {
    // the check reads `collection:modified-at` fail-open, so during a Valkey outage a staff bump
    // waits out the entry's age; a failed indexer read rebuilds through the handler instead
    const current = await fetchCollectionList({ artist: [] }, entry.lastModifiedMs).catch(
      () => null,
    );
    if (current?.notModified) return respond(entry, encoding);
  }
  if (entry) entries.delete(key);

  // concurrent misses share one rebuild instead of each serializing the list
  let pending = building.get(key);
  const mine = !pending;
  if (!pending) {
    pending = build(key, handle).finally(() => building.delete(key));
    building.set(key, pending);
  }
  const built = await pending;
  if ("entry" in built) return respond(built.entry, encoding);
  // a response that can't be cached is read once, so only the request that made it gets it
  return mine ? built.response : null;
}
