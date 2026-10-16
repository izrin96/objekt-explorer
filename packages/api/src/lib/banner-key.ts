/**
 * The bucket key of `address`'s own banner behind `url`, or null for anything else.
 * `getPresignedPost` names uploads `profile-banner/<address>-<timestamp>.<ext>`; older
 * ones kept the checksummed address and took the extension from the client's file name, so
 * only the address is matched exactly and the rest must stay one path segment.
 */
export function ownBannerKey(url: string, publicUrl: string, address: string): string | null {
  const base = `${publicUrl}/`;
  if (!url.startsWith(base)) return null;
  const key = url.slice(base.length);
  const prefix = `profile-banner/${address}-`;
  if (!key.toLowerCase().startsWith(prefix.toLowerCase())) return null;
  return /^[^/\\?#]+$/.test(key.slice(prefix.length)) ? key : null;
}
