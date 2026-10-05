import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { type acceptedFileMimeTypes, mimeTypeToExtension } from "@repo/lib/media";
import { and, eq, sql } from "drizzle-orm";

import { type ApiMessages, authed, optionalAuthed } from "../orpc";
import { addressOrBareInputSchema, addressSchema } from "../schemas/common/address";
import { documented, errorResponses } from "../schemas/common/documented";
import {
  makeEditProfileInputSchema,
  presignedPostInputSchema,
  profilePreviewOutputSchema,
} from "../schemas/profile";
import { assertProfileOwned, fetchProfilePreview } from "../services/profile";
import {
  createPresignedUploadUrl,
  deleteFileFromBucket,
  getS3PublicUrl,
  S3_BUCKET,
  S3_PUBLIC_URL,
} from "../services/s3";

export const profileRouter = {
  preview: optionalAuthed
    .route({
      method: "GET",
      path: "/profiles/{address}",
      tags: ["Profiles"],
      summary: "A profile's hover card: nickname, banner and counts",
      spec: errorResponses(400),
    })
    .input(addressOrBareInputSchema)
    .output(documented(profilePreviewOutputSchema))
    .handler(({ input, context: { session } }) =>
      fetchProfilePreview(input.address, session?.user),
    ),

  find: authed
    .input(addressSchema)
    .handler(async ({ input: address, context: { messages, session } }) => {
      const profile = await fetchOwnedProfile(address, session.user.id, messages);
      return profile;
    }),

  edit: authed
    .input(makeEditProfileInputSchema(`${S3_PUBLIC_URL}/profile-banner/`))
    .handler(async ({ input: { address, ...rest }, context: { messages, session } }) => {
      const profile = await fetchOwnedProfile(address, session.user.id, messages);

      // `getPresignedPost` names every upload after its address, so a banner
      // URL outside that prefix is another profile's file. Older uploads kept
      // the checksummed address, hence the case-insensitive match.
      const ownPrefix = `${S3_PUBLIC_URL}/profile-banner/${address}-`.toLowerCase();
      const isOwnBanner = (url: string) => url.toLowerCase().startsWith(ownPrefix);
      if (rest.bannerImgUrl && !isOwnBanner(rest.bannerImgUrl)) {
        throw new ORPCError("BAD_REQUEST");
      }

      await db
        .update(userAddress)
        .set({
          ...rest,
          bannerUpdatedAt: rest.bannerImgUrl !== undefined ? sql`'now'` : undefined,
        })
        .where(and(eq(userAddress.address, address), eq(userAddress.userId, session.user.id)));

      // Delete the old banner only once the row no longer points at it, so a
      // failed update cannot leave a dangling URL
      if (
        profile.bannerImgUrl &&
        isOwnBanner(profile.bannerImgUrl) &&
        rest.bannerImgUrl !== undefined &&
        rest.bannerImgUrl !== profile.bannerImgUrl
      ) {
        const fileName = profile.bannerImgUrl.split("/").pop();
        if (fileName) {
          await deleteFileFromBucket(S3_BUCKET, `profile-banner/${fileName}`);
        }
      }
    }),

  getPresignedPost: authed
    .input(presignedPostInputSchema)
    .handler(async ({ input: { address, mimeType, fileSize }, context: { messages, session } }) => {
      await assertProfileOwned(address, session.user.id, messages);

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

async function fetchOwnedProfile(address: string, userId: string, messages: ApiMessages) {
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
      message: messages.profile_not_found(),
    });
  }

  return profile;
}
