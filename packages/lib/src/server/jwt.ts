import type { JWTPayload } from "jose";
import { decodeJwt } from "jose/jwt/decode";
import { SignJWT } from "jose/jwt/sign";

/**
 * Returns true if the JWT is well-formed and its `exp` claim is in the
 * future. Throws if the token cannot be decoded as a JWT.
 */
export function validateExpiry(token: string): boolean {
  const claims = decodeJwt(token);
  return claims.exp !== undefined && claims.exp > Date.now() / 1000;
}

/**
 * Decode a JWT and return its `exp` claim as a Unix timestamp (seconds).
 * Returns null if the token has no `exp` claim or cannot be decoded.
 */
export function readExpiry(token: string): number | null {
  try {
    const claims = decodeJwt(token);
    return claims.exp ?? null;
  } catch {
    return null;
  }
}

/** An HS256 token over `claims`, as Centrifugo verifies it with the shared secret. */
export function signHs256(claims: JWTPayload, secret: string): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(new TextEncoder().encode(secret));
}
