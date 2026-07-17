import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

/**
 * Encrypt a payload.
 */
export function encrypt(plaintext: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, "base64");
  const iv = randomBytes(16);

  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  return Buffer.concat([iv, encrypted]).toString("base64");
}

/**
 * Decrypt a payload produced by `encrypt`. IV is the first 16 bytes.
 */
export function decrypt(ciphertextBase64: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, "base64");
  const buf = Buffer.from(ciphertextBase64, "base64");
  const iv = buf.subarray(0, 16);
  const ciphertext = buf.subarray(16);

  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted.toString("utf8");
}

export class EncryptionError extends Error {}
