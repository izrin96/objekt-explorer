export function cacheHeaders(cdn = 10) {
  return {
    "Cache-Control": `public, max-age=0`,
    "CDN-Cache-Control": `public, s-maxage=${cdn}, stale-while-revalidate=30`,
  };
}
