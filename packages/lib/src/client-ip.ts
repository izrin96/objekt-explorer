/**
 * Where the client's address arrives, first match wins. Cloudflare overwrites cf-connecting-ip
 * on every proxied request, but anyone reaching the origin directly can send it, so it is only
 * trustworthy while the origin accepts 80/443 from Cloudflare's ranges alone. Traefik
 * overwrites x-real-ip with the peer address: the visitor without Cloudflare (staging, local),
 * a Cloudflare edge with it. Any other header arrives as the client wrote it.
 */
export const CLIENT_IP_HEADERS = ["cf-connecting-ip", "x-real-ip"] as const;

export function clientIp(headers: Headers): string | undefined {
  for (const name of CLIENT_IP_HEADERS) {
    const value = headers.get(name)?.trim();
    if (value) return value;
  }
  return undefined;
}
