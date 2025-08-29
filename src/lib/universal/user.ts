import type { Session } from "../server/auth";
import type { List, UserAddress } from "../server/db/schema";

export type ProfileAddress = Pick<UserAddress, "address"> & Partial<Pick<UserAddress, "nickname">>;

export type PublicProfile = ProfileAddress &
  Partial<Pick<UserAddress, "bannerImgUrl" | "bannerImgType" | "privateProfile">> & {
    user?: PublicUser | null;
  };

export type PublicUser = Pick<
  Session["user"],
  "name" | "image" | "username" | "discord" | "twitter" | "displayUsername" | "showSocial"
>;

export type ProviderId = "twitter" | "discord";
export type Provider = {
  id: ProviderId;
  label: string;
};

export const providersMap: Record<ProviderId, Provider> = {
  twitter: {
    id: "twitter",
    label: "Twitter (X)",
  },
  discord: {
    id: "discord",
    label: "Discord",
  },
};

export type PublicList = Pick<List, "slug" | "name"> & {
  user?: PublicUser | null;
};
