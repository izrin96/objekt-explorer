export function cacheHeaders(cdn = 15) {
  return {
    "Cache-Control": `public, max-age=${10}`,
    "CDN-Cache-Control": `public, max-age=${cdn}`,
  };
}
