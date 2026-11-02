/**
 * One Intl formatter per key (the locale, plus whatever else varies its options). Building one
 * costs far more than calling `format`, and these run per row or per tick. A `build` that throws
 * (an unknown currency) stores nothing.
 */
export function intlCached<T>(cache: Map<string, T>, key: string, build: () => T): T {
  let formatter = cache.get(key);
  if (formatter === undefined) {
    formatter = build();
    cache.set(key, formatter);
  }
  return formatter;
}
