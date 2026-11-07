/**
 * Writes a brotli copy (`<file>.br`) beside each compressible client asset after `vite build`.
 * Quality 11 is about 16% smaller than gzip on this build but takes seconds over every asset,
 * too slow for server startup, so it is done once here and `static-routes.ts` serves the copy.
 */
import path from "node:path";
import { brotliCompressSync, constants } from "node:zlib";

import { CLIENT_DIRECTORY, GZIP_MIN_BYTES, GZIP_TYPES } from "./config";

const compressible = (type: string) =>
  GZIP_TYPES.some((prefix) => (prefix.endsWith("/") ? type.startsWith(prefix) : type === prefix));

let written = 0;
let rawBytes = 0;
let brBytes = 0;
for await (const relative of new Bun.Glob("**/*").scan({ cwd: CLIENT_DIRECTORY })) {
  if (relative.endsWith(".br")) continue;
  const file = Bun.file(path.join(CLIENT_DIRECTORY, relative));
  const type = file.type.split(";")[0]!.trim();
  if (file.size < GZIP_MIN_BYTES || !compressible(type)) continue;
  const raw = await file.bytes();
  const br = brotliCompressSync(raw, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
      [constants.BROTLI_PARAM_SIZE_HINT]: raw.byteLength,
    },
  });
  await Bun.write(path.join(CLIENT_DIRECTORY, `${relative}.br`), br);
  written += 1;
  rawBytes += raw.byteLength;
  brBytes += br.byteLength;
}
console.log(
  `[brotli] ${written} assets, ${(rawBytes / 1024).toFixed(0)} KB to ${(brBytes / 1024).toFixed(0)} KB`,
);
