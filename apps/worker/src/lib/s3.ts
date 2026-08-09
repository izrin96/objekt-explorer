import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { CACHE_CONTROL } from "@repo/lib/media";

const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION ?? "auto";
const publicUrl = process.env.S3_PUBLIC_URL ?? endpoint;

export const BUCKET = process.env.S3_BUCKET ?? "";
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
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${FOLDER}/${key}`,
      Body: buffer,
      ContentType: "image/webp",
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
