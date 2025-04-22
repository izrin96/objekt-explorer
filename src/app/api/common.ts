export function cacheHeaders(ttl?: number) {
  return {
    "Cache-Control": "max-age=15",
    "CDN-Cache-Control": "max-age=30",
    "Vercel-CDN-Cache-Control": `max-age=${ttl ?? 30}, stale-while-revalidate=15`,
  };
}
