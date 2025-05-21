import { User, UserAddress } from "../server/db/schema";

export type PublicProfile = Pick<UserAddress, "nickname" | "address"> &
  Partial<Pick<UserAddress, "bannerImgUrl" | "privateProfile">> & {
    user?: PublicUser | null;
  };

export type PublicUser = Pick<
  User,
  "name" | "image" | "username" | "discord" | "displayUsername"
>;
