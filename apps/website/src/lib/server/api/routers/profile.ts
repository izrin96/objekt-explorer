import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { and, eq } from "drizzle-orm";
import * as z from "zod";

import { serverEnv } from "@/lib/env/server";
import { m } from "@/paraglide/messages";

import { createPresignedUploadUrl, deleteFileFromBucket, getS3PublicUrl } from "../../s3.server";
import { authed } from "../orpc";

export const profileRouter = {
  find: authed.input(z.string()).handler(async ({ input: address, context: { session } }) => {
    const profile = await fetchOwnedProfile(address, session.user.id);
    return profile;
  }),

  edit: authed
    .input(
      z.object({
        address: z.string(),
        hideUser: z.boolean(),
        bannerImgUrl: z
          .url()
          .refine((url) => url.startsWith(`${serverEnv.S3_ENDPOINT}/profile-banner/`))
          .nullish(),
        bannerImgType: z.string().nullish(),
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
          await deleteFileFromBucket("profile-banner", fileName);
        }
      }

      await db
        .update(userAddress)
        .set({
          ...rest,
        })
        .where(and(eq(userAddress.address, address), eq(userAddress.userId, session.user.id)));
    }),

  getPresignedPost: authed
    .input(
      z.object({
        address: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
      }),
    )
    .handler(async ({ input: { address, fileName, mimeType }, context: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      const ext = fileName.split(".").pop();
      const key = `${address.toLowerCase()}-${Date.now()}.${ext}`;
      const { url } = createPresignedUploadUrl("profile-banner", key, mimeType);

      return { url, key, publicUrl: getS3PublicUrl("profile-banner", key) };
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
