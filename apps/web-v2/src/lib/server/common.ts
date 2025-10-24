import * as z from "zod/v4";

export const cursorSchema = z
  .object({
    id: z.string(),
  })
  .optional();

export function cacheHeaders(cdn = 10) {
  return {
    "Cache-Control": `public, max-age=0`,
    "CDN-Cache-Control": `public, s-maxage=${cdn}, stale-while-revalidate=30`,
  };
}
