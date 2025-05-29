import { Session } from "../server/auth";
import { UserAddress } from "../server/db/schema";

export type PublicProfile = Pick<UserAddress, "nickname" | "address"> &
  Partial<Pick<UserAddress, "bannerImgUrl" | "privateProfile">> & {
    user?: PublicUser | null;
  };

export type PublicUser = Pick<
  Session["user"],
  | "name"
  | "image"
  | "username"
  | "discord"
  | "twitter"
  | "displayUsername"
  | "showSocial"
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
