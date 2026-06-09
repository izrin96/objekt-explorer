import { S3Client, type S3Options } from "bun";

const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY;
const secretAccessKey = process.env.S3_SECRET_KEY;
const region = process.env.S3_REGION ?? "auto";
const publicUrl = process.env.S3_PUBLIC_URL ?? endpoint;

const BUCKET = process.env.S3_BUCKET ?? "";
const FOLDER = "collection-images";

const s3Config: S3Options = {
  accessKeyId,
  secretAccessKey,
  endpoint,
  region,
};

export async function uploadWebp(key: string, buffer: Buffer) {
  await S3Client.write(`${FOLDER}/${key}`, buffer, {
    ...s3Config,
    bucket: BUCKET,
    type: "image/webp",
  });
}

export function s3Url(key: string) {
  return `${publicUrl}/${FOLDER}/${key}`;
}
