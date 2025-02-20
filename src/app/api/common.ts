export function cacheHeaders(ttl?: number) {
  return {
    "Cache-Control": "max-age=30",
    "CDN-Cache-Control": "max-age=60",
    "Vercel-CDN-Cache-Control": `max-age=${ttl ?? 60}, stale-while-revalidate=30`,
  };
}
