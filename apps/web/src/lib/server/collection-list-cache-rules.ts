import { collectionListInputSchema } from "@repo/api/schemas/collections";

export type Encoding = "br" | "gzip" | "identity";

const shapeSchema = collectionListInputSchema.pick({ originals: true, ids: true }).strict();

/**
 * The cache key for a collection list request worth caching: the unfiltered list every profile
 * page fetches, the same for every viewer. A filtered list (`artist`, `at`) runs its own query
 * and is left to the handler; so is a conditional GET, which the handler answers with a 304.
 * The key is the parsed shape, never the query text: `ids` takes many spellings (`0`, `no`,
 * `oFf`), and a key per spelling would let a crawler fill memory with copies of one list.
 */
export function listCacheKey(url: URL, headers: Headers): string | null {
  if (url.pathname !== "/api/v1/collections") return null;
  if (headers.has("if-modified-since")) return null;
  const names = [...url.searchParams.keys()];
  // a repeated name reaches the handler as an array, which it refuses
  if (new Set(names).size !== names.length) return null;
  const shape = shapeSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!shape.success) return null;
  return `originals=${String(shape.data.originals)}&ids=${String(shape.data.ids)}`;
}

/** The encoding the server's own compression would choose for JSON (`bun-server/compress.ts`). */
export function jsonEncoding(acceptEncoding: string | null, enabled: boolean): Encoding {
  if (!enabled || !acceptEncoding) return "identity";
  if (acceptEncoding.includes("br")) return "br";
  if (acceptEncoding.includes("gzip")) return "gzip";
  return "identity";
}
