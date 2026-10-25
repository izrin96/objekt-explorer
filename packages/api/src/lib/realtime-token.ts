/** How long a connection token lives; the client asks for a new one before it runs out. */
export const CONNECTION_TOKEN_TTL_SECONDS = 10 * 60;

/** The claims Centrifugo reads: `sub` names the user, whose personal channel the connection joins. */
export function connectionClaims(userId: string, nowMs: number) {
  const iat = Math.floor(nowMs / 1000);
  return { sub: userId, iat, exp: iat + CONNECTION_TOKEN_TTL_SECONDS };
}
