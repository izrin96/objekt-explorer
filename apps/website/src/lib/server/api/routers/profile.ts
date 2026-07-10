import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { isAddress } from "@repo/lib";
import { and, eq, sql } from "drizzle-orm";
import * as z from "zod";

import { acceptedFileMimeTypes, mimeTypeToExtension, MAX_FILE_SIZE } from "@/lib/file";
import { m } from "@/paraglide/messages";

import {
  createPresignedUploadUrl,
  deleteFileFromBucket,
  getS3PublicUrl,
  S3_BUCKET,
  S3_PUBLIC_URL,
} from "../../s3.server";
import { authed } from "../orpc";

export const profileRouter = {
  find: authed
    .input(z.string().refine((val) => isAddress(val)))
    .handler(async ({ input: address, context: { session } }) => {
      const profile = await fetchOwnedProfile(address, session.user.id);
      return profile;
    }),

  edit: authed
    .input(
      z.object({
        address: z.string().refine((val) => isAddress(val)),
        hideUser: z.boolean(),
        bannerImgUrl: z
          .url()
          .max(512)
          .refine((url) => url.startsWith(`${S3_PUBLIC_URL}/profile-banner/`))
          .nullish(),
        bannerImgType: z.string().max(50).nullish(),
        privateSerial: z.boolean(),
        privateProfile: z.boolean(),
        hideNickname: z.boolean(),
        hideTransfer: z.boolean(),
        gridColumns: z.number().min(2).max(18).nullable(),
      }),
    )
    .handler(async ({ input: { address, ...rest }, context: { session } }) => {
      const profile = await fetchOwnedProfile(address, session.user.id);

      // Delete previous banner if it exists and new banner is being set
      if (profile.bannerImgUrl && rest.bannerImgUrl !== undefined) {
        const fileName = profile.bannerImgUrl.split("/").pop();
        if (fileName) {
          await deleteFileFromBucket(S3_BUCKET, `profile-banner/${fileName}`);
        }
      }

      await db
        .update(userAddress)
        .set({
          ...rest,
          bannerUpdatedAt: rest.bannerImgUrl !== undefined ? sql`'now'` : undefined,
        })
        .where(and(eq(userAddress.address, address), eq(userAddress.userId, session.user.id)));
    }),

  getPresignedPost: authed
    .input(
      z.object({
        address: z.string().refine((val) => isAddress(val)),
        fileName: z.string().min(1),
        mimeType: z.string().refine((val) => new Set<string>(acceptedFileMimeTypes).has(val)),
        fileSize: z.number().int().min(1).max(MAX_FILE_SIZE),
      }),
    )
    .handler(async ({ input: { address, mimeType, fileSize }, context: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      const ext = mimeTypeToExtension[mimeType as (typeof acceptedFileMimeTypes)[number]];
      const key = `${address.toLowerCase()}-${Date.now()}.${ext}`;
      const { url } = await createPresignedUploadUrl(
        S3_BUCKET,
        `profile-banner/${key}`,
        mimeType,
        fileSize,
      );

      return {
        url,
        key: `profile-banner/${key}`,
        publicUrl: getS3PublicUrl(`profile-banner/${key}`),
      };
    }),
};

export async function checkAddressOwned(address: string, userId: string) {
  const count = await db.$count(
    userAddress,
    and(eq(userAddress.address, address), eq(userAddress.userId, userId)),
  );

  if (count < 1) {
    throw new ORPCError("UNAUTHORIZED", {
      message: m.api_errors_profile_not_linked(),
    });
  }
}

async function fetchOwnedProfile(address: string, userId: string) {
  const profile = await db.query.userAddress.findFirst({
    columns: {
      nickname: true,
      address: true,
      hideUser: true,
      bannerImgUrl: true,
      bannerImgType: true,
      privateSerial: true,
      privateProfile: true,
      hideNickname: true,
      hideTransfer: true,
      gridColumns: true,
    },
    where: { address, userId },
    orderBy: {
      id: "desc",
    },
  });

  if (!profile) {
    throw new ORPCError("NOT_FOUND", {
      message: m.api_errors_profile_not_found(),
    });
  }

  return profile;
}
