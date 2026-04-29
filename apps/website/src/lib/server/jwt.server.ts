import { decodeJwt } from "jose/jwt/decode";

export function validateExpiry(token: string): boolean {
  const claims = decodeJwt(token);
  return claims.exp !== undefined && claims.exp > Date.now() / 1000;
}
