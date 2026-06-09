import { S3Client, type S3Options } from "bun";

import { serverEnv } from "@/lib/env/server";

export const S3_BUCKET = serverEnv.S3_BUCKET ?? "";
export const S3_PUBLIC_URL = serverEnv.S3_PUBLIC_URL ?? serverEnv.S3_ENDPOINT;

const s3Config: S3Options = {
  accessKeyId: serverEnv.S3_ACCESS_KEY,
  secretAccessKey: serverEnv.S3_SECRET_KEY,
  endpoint: serverEnv.S3_ENDPOINT,
  region: serverEnv.S3_REGION ?? "auto",
};

export async function deleteFileFromBucket(bucketName: string, fileName: string) {
  try {
    await S3Client.delete(fileName, { ...s3Config, bucket: bucketName });
  } catch (error) {
    console.error("Failed to delete file from S3:", error);
    throw error;
  }
}

export function getS3PublicUrl(key: string) {
  return `${S3_PUBLIC_URL}/${key}`;
}

export function createPresignedUploadUrl(bucketName: string, key: string, mimeType: string) {
  try {
    const url = S3Client.presign(key, {
      ...s3Config,
      bucket: bucketName,
      method: "PUT",
      expiresIn: 3600,
      type: mimeType,
    });

    return { url, key };
  } catch (error) {
    console.error("Failed to create presigned upload URL:", error);
    throw error;
  }
}
