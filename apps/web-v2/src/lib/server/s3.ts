import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env/server";

export const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: env.S3_ENDPOINT || "",
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY || "",
    secretAccessKey: env.S3_SECRET_KEY || "",
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

export async function createPresignedUrlToUpload({
  bucketName,
  fileName,
  expiry = 60 * 60,
}: {
  bucketName: string;
  fileName: string;
  expiry?: number;
}) {
  await createBucketIfNotExists(bucketName);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    CacheControl: "private, max-age=31536000",
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: expiry,
  });

  return url;
}
