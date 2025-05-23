import { Session } from "../server/auth";
import { UserAddress } from "../server/db/schema";

export type PublicProfile = Pick<UserAddress, "nickname" | "address"> &
  Partial<Pick<UserAddress, "bannerImgUrl" | "privateProfile">> & {
    user?: PublicUser | null;
  };

export type PublicUser = Pick<
  Session["user"],
  "name" | "image" | "username" | "discord" | "displayUsername" | "showSocial"
>;
