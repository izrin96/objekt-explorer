import { User, UserAddress } from "../server/db/schema";

export type PublicProfile = Pick<UserAddress, "nickname" | "address"> & {
  user?: PublicUser | null;
};

export type PublicUser = Pick<User, "name" | "image" | "username">;
