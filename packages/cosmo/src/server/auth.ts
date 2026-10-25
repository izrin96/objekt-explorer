import type { RefreshTokenResult } from "../types/auth";
import { encrypt, EncryptionError } from "./encryption";
import { cosmo } from "./http";

/**
 * Refresh the given token.
 */
export async function refreshV3(
  refreshToken: string,
  key: string,
  signal: AbortSignal | null = null,
): Promise<RefreshTokenResult> {
  try {
    var body = encrypt(JSON.stringify({ refreshToken }), key);
  } catch (err) {
    throw new EncryptionError("Error encrypting payload", { cause: err });
  }

  return await cosmo<{ credentials: RefreshTokenResult }>("/bff/v3/users/refresh-access-token", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "text/plain",
      "x-cosmo-encrypted": "1",
    },
    signal,
  }).then((res: { credentials: RefreshTokenResult }) => res.credentials);
}
