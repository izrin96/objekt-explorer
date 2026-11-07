import { Readable, pipeline } from "node:stream";
import { constants, createBrotliCompress, createGzip } from "node:zlib";

import { ENABLE_GZIP, GZIP_MIN_BYTES, GZIP_TYPES } from "./config";

/**
 * Check if a MIME type is compressible
 */
function isMimeTypeCompressible(mimeType: string): boolean {
  return GZIP_TYPES.some((type) =>
    type.endsWith("/") ? mimeType.startsWith(type) : mimeType === type,
  );
}

/**
 * Conditionally compress data based on size and MIME type
 */
export function compressDataIfAppropriate(
  data: Uint8Array,
  mimeType: string,
): Uint8Array | undefined {
  if (!ENABLE_GZIP) return undefined;
  if (data.byteLength < GZIP_MIN_BYTES) return undefined;
  if (!isMimeTypeCompressible(mimeType)) return undefined;
  try {
    return Bun.gzipSync(data.buffer as ArrayBuffer);
  } catch {
    return undefined;
  }
}

/**
 * Compress a dynamic response (SSR HTML, `/api` and `/rpc` JSON) on the way out, JSON with
 * brotli where the browser takes it and everything else with gzip, under the same switch, size floor and MIME list as the preloaded assets.
 * Streamed, so an SSR page still arrives while it renders; a response of
 * unknown length is compressed, one known to be under the floor is not.
 */
export function compressResponse(req: Request, response: Response): Response {
  if (!ENABLE_GZIP || response.body === null || req.method === "HEAD") return response;
  if (response.headers.has("content-encoding")) return response;
  const accepts = req.headers.get("accept-encoding") ?? "";
  if (!accepts.includes("gzip") && !accepts.includes("br")) return response;

  const mimeType = (response.headers.get("content-type") ?? "").split(";")[0]!.trim();
  if (!isMimeTypeCompressible(mimeType)) return response;
  const length = response.headers.get("content-length");
  if (length !== null && Number(length) < GZIP_MIN_BYTES) return response;

  // an event stream has to reach the client event by event, so it stays on gzip, flushed per
  // chunk; so does SSR HTML, which streams as it renders and which brotli would hold back longer
  const stream = mimeType === "text/event-stream";
  const brotli = mimeType === "application/json" && accepts.includes("br");
  if (!brotli && !accepts.includes("gzip")) return response;

  const headers = new Headers(response.headers);
  headers.set("Content-Encoding", brotli ? "br" : "gzip");
  headers.delete("Content-Length");
  headers.append("Vary", "Accept-Encoding");
  const through = (transform: NodeJS.ReadWriteStream) =>
    Readable.toWeb(
      pipeline(Readable.fromWeb(response.body as never), transform, () => {}),
    ) as unknown as ReadableStream<Uint8Array>;
  const body = brotli
    ? // quality 5: on the 11.6 MB collection list, 19% under gzip in about 60 ms; 11 takes seconds
      through(createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }))
    : stream
      ? through(createGzip({ flush: constants.Z_SYNC_FLUSH }))
      : response.body.pipeThrough(new CompressionStream("gzip"));
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
