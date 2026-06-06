import { S3Client, type S3Options } from "bun";

const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY;
const secretAccessKey = process.env.S3_SECRET_KEY;

const BUCKET = "collection-images";

const s3Config: S3Options = {
  accessKeyId,
  secretAccessKey,
  endpoint,
};

export async function uploadWebp(key: string, buffer: Buffer) {
  await S3Client.write(key, buffer, {
    ...s3Config,
    bucket: BUCKET,
    type: "image/webp",
    acl: "public-read",
  });
}

export function s3Url(key: string) {
  return `${endpoint}/${BUCKET}/${key}`;
}
