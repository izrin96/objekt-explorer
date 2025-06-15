export function cacheHeaders(age = 15) {
  return {
    "Cache-Control": `max-age=${age}`,
    "CDN-Cache-Control": `max-age=0, s-maxage=${age}`,
  };
}
