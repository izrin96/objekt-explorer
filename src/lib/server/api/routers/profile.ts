import { z } from "zod/v4";
import { authProcedure, createTRPCRouter } from "@/lib/server/api/trpc";
import { db } from "../../db";
import { TRPCError } from "@trpc/server";
import { userAddress } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { fetchUserProfiles } from "../../profile";
import { createPresignedUrlToUpload, deleteFileFromBucket } from "../../minio";

export const profileRouter = createTRPCRouter({
  getAll: authProcedure.query(async ({ ctx: { session } }) => {
    return await fetchUserProfiles(session.user.id);
  }),

  get: authProcedure
    .input(z.string())
    .query(async ({ input: address, ctx: { session } }) => {
      const profile = await fetchOwnedProfile(address, session.user.id);
      return profile;
    }),

  edit: authProcedure
    .input(
      z.object({
        address: z.string(),
        hideUser: z.boolean().optional(),
        bannerImgUrl: z.string().optional().nullable(),
        bannerImgType: z.string().optional().nullable(),
        privateSerial: z.boolean().optional(),
        privateProfile: z.boolean().optional(),
        hideActivity: z.boolean().optional(),
      })
    )
    .mutation(async ({ input: { address, ...rest }, ctx: { session } }) => {
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
        .where(
          and(
            eq(userAddress.address, address),
            eq(userAddress.userId, session.user.id)
          )
        );
    }),

  getPresignedUrl: authProcedure
    .input(
      z.object({
        address: z.string(),
        fileName: z.string(),
      })
    )
    .mutation(async ({ input: { address, fileName }, ctx: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      const ext = fileName.split(".").pop();
      const url = await createPresignedUrlToUpload({
        bucketName: "profile-banner",
        fileName: `${address}-${Date.now()}.${ext}`,
      });

      return url;
    }),
});

export async function checkAddressOwned(address: string, userId: string) {
  const count = await db.$count(
    userAddress,
    and(eq(userAddress.address, address), eq(userAddress.userId, userId))
  );

  if (count < 1)
    throw new TRPCError({
      code: "UNAUTHORIZED",
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
      hideActivity: true,
    },
    where: (q, { eq, and }) =>
      and(eq(q.address, address), eq(q.userId, userId)),
  });

  if (!profile)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Profile not found or not link with this account",
    });

  return profile;
}
