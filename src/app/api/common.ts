export function cacheHeaders(age?: number) {
  return {
    "Cache-Control": "max-age=30",
    "CDN-Cache-Control": "max-age=60",
    "Vercel-CDN-Cache-Control": `max-age=${age ?? 60}`,
  };
}
