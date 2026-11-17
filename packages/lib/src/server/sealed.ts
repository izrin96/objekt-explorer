import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function decodeKey(keyBase64: string) {
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) throw new Error("Sealing key must decode to 32 bytes");
  return key;
}

/** Binds a sealed value to its row: a ciphertext copied to another user or account fails to open. */
export function sessionAad(userId: string, address: string) {
  return `cosmo_session:${userId}:${address.toLowerCase()}`;
}

/** `v1.<iv>.<ciphertext>.<tag>`, base64url. */
export function seal(plaintext: string, keyBase64: string, aad: string) {
  const key = decodeKey(keyBase64);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [VERSION, iv, ciphertext, cipher.getAuthTag()]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

/** Throws on any failure: a wrong key or AAD, a changed byte, an unknown version, a malformed value. */
export function open(sealed: string, keyBase64: string, aad: string) {
  const key = decodeKey(keyBase64);
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) throw new Error("Unreadable sealed value");
  const [, iv, ciphertext, tag] = parts.map((part, i) =>
    i === 0 ? Buffer.alloc(0) : Buffer.from(part!, "base64url"),
  ) as [Buffer, Buffer, Buffer, Buffer];
  // GCM would accept a shorter tag; only the full 16 bytes carry the security level
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES)
    throw new Error("Unreadable sealed value");
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
