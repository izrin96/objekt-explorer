import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { serverEnv } from "@/lib/env/server";

export const S3_BUCKET = serverEnv.S3_BUCKET ?? "";
export const S3_PUBLIC_URL = serverEnv.S3_PUBLIC_URL ?? serverEnv.S3_ENDPOINT;

const s3Client = new S3Client({
  region: serverEnv.S3_REGION ?? "auto",
  endpoint: serverEnv.S3_ENDPOINT,
  credentials: {
    accessKeyId: serverEnv.S3_ACCESS_KEY,
    secretAccessKey: serverEnv.S3_SECRET_KEY,
  },
});

export async function deleteFileFromBucket(bucketName: string, fileName: string) {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileName,
      }),
    );
  } catch (error) {
    console.error("Failed to delete file from S3:", error);
    throw error;
  }
}

export function getS3PublicUrl(key: string) {
  return `${S3_PUBLIC_URL}/${key}`;
}

export async function createPresignedUploadUrl(
  bucketName: string,
  key: string,
  mimeType: string,
  contentLength: number,
) {
  try {
    const url = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: mimeType,
        ContentLength: contentLength,
      }),
      { expiresIn: 3600 },
    );

    return { url, key };
  } catch (error) {
    console.error("Failed to create presigned upload URL:", error);
    throw error;
  }
}
