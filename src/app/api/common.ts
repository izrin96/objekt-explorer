export function cacheHeaders(cdn = 15) {
  return {
    "Cache-Control": `max-age=${10}`,
    "CDN-Cache-Control": `max-age=0, s-maxage=${cdn}`,
  };
}
