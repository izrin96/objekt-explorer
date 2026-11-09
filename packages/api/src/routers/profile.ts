import { ORPCError } from "@orpc/server";
import { type acceptedFileMimeTypes, mimeTypeToExtension } from "@repo/lib/media";

import { ownBannerKey } from "../lib/banner-key";
import { authed, optionalAuthed } from "../orpc";
import { addressOrBareInputSchema, addressSchema } from "../schemas/common/address";
import { documented, errorResponses } from "../schemas/common/documented";
import {
  makeEditProfileInputSchema,
  presignedPostInputSchema,
  profilePreviewOutputSchema,
} from "../schemas/profile";
import {
  assertProfileOwned,
  fetchOwnedProfile,
  fetchProfilePreview,
  updateProfile,
} from "../services/profile";
import { refuseOverUserLimit } from "../services/redis";
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
    .handler(({ input }) => fetchProfilePreview(input.address)),

  find: authed.input(addressSchema).handler(async ({ input: address, context: { session } }) => {
    const profile = await fetchOwnedProfile(address, session.user.id);
    return profile;
  }),

  edit: authed
    .input(makeEditProfileInputSchema(`${S3_PUBLIC_URL}/profile-banner/`))
    .handler(async ({ input, context: { session } }) => {
      const { address, bannerImgUrl, bannerImgType, gridColumns, bio } = input;
      const profile = await fetchOwnedProfile(address, session.user.id);

      if (bannerImgUrl && !ownBannerKey(bannerImgUrl, S3_PUBLIC_URL, address)) {
        throw new ORPCError("BAD_REQUEST");
      }

      await updateProfile(address, session.user.id, {
        bannerImgUrl,
        bannerImgType,
        gridColumns,
        bio,
      });

      // Delete the old banner only once the row no longer points at it, so a
      // failed update cannot leave a dangling URL
      const oldKey = profile.bannerImgUrl
        ? ownBannerKey(profile.bannerImgUrl, S3_PUBLIC_URL, address)
        : null;
      if (oldKey && bannerImgUrl !== undefined && bannerImgUrl !== profile.bannerImgUrl) {
        await deleteFileFromBucket(S3_BUCKET, oldKey);
      }
    }),

  getPresignedPost: authed
    .input(presignedPostInputSchema)
    .handler(async ({ input: { address, mimeType, fileSize }, context: { session } }) => {
      // each call signs a fresh upload key, and only the banner it replaces is ever deleted
      await refuseOverUserLimit("banner-presign", session.user.id, 20, 3600);
      await assertProfileOwned(address, session.user.id);

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
