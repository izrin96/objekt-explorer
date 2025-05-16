import { z } from "zod";
import { authProcedure, createTRPCRouter } from "@/lib/server/api/trpc";
import { db } from "../../db";
import { TRPCError } from "@trpc/server";
import { userAddress } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { fetchUserProfiles } from "../../profile";

export const profileRouter = createTRPCRouter({
  getAll: authProcedure.query(async ({ ctx: { session } }) => {
    return await fetchUserProfiles(session.user.id);
  }),

  get: authProcedure
    .input(z.string())
    .query(async ({ input: address, ctx: { session } }) => {
      const profile = await db.query.userAddress.findFirst({
        columns: {
          nickname: true,
          address: true,
          hideUser: true,
          bannerImgUrl: true,
        },
        where: (q, { eq, and }) =>
          and(eq(q.address, address), eq(q.userId, session.user.id)),
      });

      if (!profile)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found or not link with this account",
        });

      return profile;
    }),

  edit: authProcedure
    .input(
      z.object({
        address: z.string(),
        hideUser: z.boolean(),
        bannerImgUrl: z.string().nullable(),
      })
    )
    .mutation(
      async ({
        input: { address, hideUser, bannerImgUrl },
        ctx: { session },
      }) => {
        await db
          .update(userAddress)
          .set({
            hideUser: hideUser,
            bannerImgUrl: bannerImgUrl,
          })
          .where(
            and(
              eq(userAddress.address, address),
              eq(userAddress.userId, session.user.id)
            )
          );
      }
    ),
});
