import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { CACHE_CONTROL } from "@repo/lib/media";

import { MEDIA_PREFIX } from "./media-copy";

const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION ?? "auto";
const publicUrl = process.env.S3_PUBLIC_URL ?? endpoint;

const BUCKET = process.env.S3_BUCKET ?? "";
export const FOLDER = "collection-images";

// bun's S3Client has no cacheControl option, so uploads go through the aws sdk
const s3Client = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
  },
});

export async function uploadWebp(key: string, buffer: Buffer) {
  await putWebp(`${FOLDER}/${key}`, buffer);
}

/** `key` is the whole bucket key, folder included. */
export async function putWebp(key: string, buffer: Buffer) {
  await putObject(key, buffer, "image/webp");
}

/** `key` is the whole bucket key. Every object carries `CACHE_CONTROL`. */
export async function putObject(key: string, body: Uint8Array, contentType: string) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: CACHE_CONTROL,
    }),
  );
}

export async function deleteObject(key: string) {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );
}

export function s3Url(key: string) {
  return `${publicUrl}/${FOLDER}/${key}`;
}

/** The public URL of a whole bucket key; `objectUrl("")` is the bucket's prefix. */
export function objectUrl(key: string) {
  return `${publicUrl}/${key}`;
}

/**
 * Recover the bucket key from a stored public URL. Returns null when the URL
 * did not come from our bucket, so callers never delete something unrelated.
 */
export function keyFromUrl(url: string) {
  const prefix = `${publicUrl}/`;
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  return key.startsWith(`${FOLDER}/`) ? key : null;
}

/** Like `keyFromUrl`, for the `collection-media/` prefix; null for any other URL or key. */
export function mediaKeyFromUrl(url: string) {
  const prefix = `${publicUrl}/`;
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  return key.startsWith(MEDIA_PREFIX) ? key : null;
}

/**
 * Whether stored media URLs can be built: the copy's URL is stored, so `S3_PUBLIC_URL` must be
 * set itself, not fall back to the endpoint.
 */
export function mediaStorageConfigured() {
  return Boolean(process.env.S3_BUCKET && process.env.S3_PUBLIC_URL);
}
