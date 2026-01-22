import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

import { env } from "@/env";

export const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

export async function createBucketIfNotExists(bucketName: string) {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
  } catch (error) {
    if (
      error instanceof S3ServiceException &&
      (error.name === "NotFound" || error.$metadata.httpStatusCode === 404)
    ) {
      await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
    } else {
      throw error;
    }
  }
}

export async function deleteFileFromBucket({
  bucketName,
  fileName,
}: {
  bucketName: string;
  fileName: string;
}) {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileName,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export async function createPresignedPostToUpload({
  bucketName,
  key,
  mimeType,
}: {
  bucketName: string;
  key: string;
  mimeType: string;
}) {
  await createBucketIfNotExists(bucketName);

  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: bucketName,
    Key: key,
    Conditions: [
      ["content-length-range", 0, 10 * 1024 * 1024],
      ["eq", "$Content-Type", mimeType],
    ],
    Fields: {
      acl: "public-read",
    },
    Expires: 3600,
  });

  return { url, fields, key };
}
