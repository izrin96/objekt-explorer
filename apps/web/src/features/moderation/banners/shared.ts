import type { Outputs } from "@repo/api";

export type BannerPage = Outputs["admin"]["banners"];
export type Banner = BannerPage["banners"][number];

export const profileName = (banner: Banner) => banner.nickname ?? banner.address;
