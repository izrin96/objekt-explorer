import type { CosmoArtistWithMembersBFF } from "@repo/cosmo/types/artists";
import { validArtists } from "@repo/cosmo/types/common";
import * as z from "zod";

const artistIdSchema = z.enum(validArtists);
const snsLinkSchema = z.object({ name: z.string(), address: z.string() });

const artistMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  units: z.string(),
  alias: z.string(),
  profileImageUrl: z.string(),
  backgroundImageUrl: z.string(),
  order: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  mainObjektImageUrl: z.string().nullable(),
  artistId: z.string(),
  primaryColorHex: z.string(),
});

export const artistsOutputSchema = z.array(
  z.object({
    name: z.string(),
    id: artistIdSchema,
    title: z.string(),
    fandomName: z.string(),
    logoImageUrl: z.string(),
    primaryImageUrl: z.string(),
    category: z.string(),
    wasReleased: z.boolean(),
    comoTokenId: z.number(),
    contracts: z.object({
      Como: z.string(),
      Objekt: z.string(),
      ObjektMinter: z.string(),
      Governor: z.string(),
      CommunityPool: z.string(),
      ComoMinter: z.string(),
    }),
    artistMembers: z.array(artistMemberSchema),
    snsLink: z.object({
      discord: snsLinkSchema,
      instagram: snsLinkSchema,
      twitter: snsLinkSchema,
      youtube: snsLinkSchema,
      tiktok: snsLinkSchema,
    }),
  }),
) satisfies z.ZodType<CosmoArtistWithMembersBFF[]>;

export const filterDataOutputSchema = z.object({
  /** every collection number, such as `101Z` */
  collections: z.array(z.string()),
  seasonsMap: z.array(z.object({ artistId: artistIdSchema, seasons: z.array(z.string()) })),
  classesMap: z.array(z.object({ artistId: artistIdSchema, classes: z.array(z.string()) })),
});
