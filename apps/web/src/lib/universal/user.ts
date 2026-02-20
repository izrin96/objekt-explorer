import type { User } from "../server/auth";

export type PublicProfile = {
  address: string;
  nickname?: string | null;
  bannerImgUrl?: string | null;
  bannerImgType?: string | null;
  privateProfile?: boolean | null;
  gridColumns?: number | null;
  user?: PublicUser | null;
  ownerId?: string | null;
  isOwned?: boolean;
};

export type PublicUser = Pick<
  User,
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

export type PublicList = {
  slug: string;
  name: string;
  gridColumns?: number | null;
  user?: PublicUser | null;
  listType?: "normal" | "profile";
  profileAddress?: string | null;
  ownerId?: string | null;
  isOwned?: boolean;
};
