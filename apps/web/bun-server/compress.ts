import { Readable, pipeline } from "node:stream";
import { constants, createGzip } from "node:zlib";

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
 * Gzip a dynamic response (SSR HTML, `/api` and `/rpc` JSON) on the way out,
 * under the same switch, size floor and MIME list as the preloaded assets.
 * Streamed, so an SSR page still arrives while it renders; a response of
 * unknown length is compressed, one known to be under the floor is not.
 */
export function compressResponse(req: Request, response: Response): Response {
  if (!ENABLE_GZIP || response.body === null || req.method === "HEAD") return response;
  if (response.headers.has("content-encoding")) return response;
  if (!req.headers.get("accept-encoding")?.includes("gzip")) return response;

  const mimeType = (response.headers.get("content-type") ?? "").split(";")[0]!.trim();
  if (!isMimeTypeCompressible(mimeType)) return response;
  const length = response.headers.get("content-length");
  if (length !== null && Number(length) < GZIP_MIN_BYTES) return response;

  const headers = new Headers(response.headers);
  headers.set("Content-Encoding", "gzip");
  headers.delete("Content-Length");
  headers.append("Vary", "Accept-Encoding");
  // an event stream has to reach the client event by event, so flush after every chunk
  const body =
    mimeType === "text/event-stream"
      ? (Readable.toWeb(
          pipeline(
            Readable.fromWeb(response.body as never),
            createGzip({ flush: constants.Z_SYNC_FLUSH }),
            () => {},
          ),
        ) as unknown as ReadableStream<Uint8Array>)
      : response.body.pipeThrough(new CompressionStream("gzip"));
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
