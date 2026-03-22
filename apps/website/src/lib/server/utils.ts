export function filterNonNull<T>(value: T | null): value is T {
  return value !== null;
}
