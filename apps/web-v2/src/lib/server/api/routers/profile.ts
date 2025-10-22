import { ORPCError } from "@orpc/server";
import { notFound } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import * as z from "zod/v4";
import { fetchUserByIdentifier, getSession } from "../../auth";
import { db } from "../../db";
import { userAddress } from "../../db/schema";
import { fetchUserProfiles } from "../../profile";
import { createPresignedUrlToUpload, deleteFileFromBucket } from "../../s3";
import { authed, pub } from "../orpc";

export const profileRouter = {
  list: pub.handler(async () => {
    const session = await getSession();
    if (!session) return [];

    return fetchUserProfiles(session.user.id);
  }),

  find: authed
    .input(z.object({ address: z.string() }))
    .handler(async ({ input: { address }, context: { session } }) =>
      fetchOwnedProfile(address, session.user.id),
    ),

  findPublic: pub
    .input(z.object({ nickname: z.string() }))
    .handler(async ({ input: { nickname } }) => {
      const profile = await fetchUserByIdentifier(nickname);
      if (!profile) throw notFound();
      return profile;
    }),

  edit: authed
    .input(
      z.object({
        address: z.string(),
        hideUser: z.boolean().optional(),
        bannerImgUrl: z.string().optional().nullable(),
        bannerImgType: z.string().optional().nullable(),
        privateSerial: z.boolean().optional(),
        privateProfile: z.boolean().optional(),
        hideNickname: z.boolean().optional(),
        hideTransfer: z.boolean().optional(),
        gridColumns: z.number().min(2).max(18).optional().nullable(),
      }),
    )
    .handler(async ({ input: { address, ...rest }, context: { session } }) => {
      const profile = await fetchOwnedProfile(address, session.user.id);

      // Delete previous banner if it exists and new banner is being set
      if (profile.bannerImgUrl && rest.bannerImgUrl !== undefined) {
        const fileName = profile.bannerImgUrl.split("/").pop();
        if (fileName) {
          await deleteFileFromBucket({
            bucketName: "profile-banner",
            fileName,
          });
        }
      }

      await db
        .update(userAddress)
        .set({
          ...rest,
        })
        .where(and(eq(userAddress.address, address), eq(userAddress.userId, session.user.id)));
    }),

  getPresignedUrl: authed
    .input(
      z.object({
        address: z.string(),
        fileName: z.string(),
      }),
    )
    .handler(async ({ input: { address, fileName }, context: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      const ext = fileName.split(".").pop();
      const url = await createPresignedUrlToUpload({
        bucketName: "profile-banner",
        fileName: `${address}-${Date.now()}.${ext}`,
      });

      return url;
    }),
};

export async function checkAddressOwned(address: string, userId: string) {
  const count = await db.$count(
    userAddress,
    and(eq(userAddress.address, address), eq(userAddress.userId, userId)),
  );

  if (count < 1)
    throw new ORPCError("UNAUTHORIZED", {
      message: "This Cosmo not linked with your account",
    });
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
    where: (q, { eq, and }) => and(eq(q.address, address), eq(q.userId, userId)),
  });

  if (!profile)
    throw new ORPCError("NOT_FOUND", {
      message: "Profile not found or not link with this account",
    });

  return profile;
}
