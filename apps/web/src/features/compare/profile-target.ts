import type { useUserProfiles } from "@/features/user/hooks";
import { isSameAddress, nicknameParam } from "@/lib/address";

import type { ActiveCompare } from "./search-schema";

type Profile = ReturnType<typeof useUserProfiles>[number];

/** a linked profile by its address or its nickname, as `cmp_to` may hold either */
export function findProfile(profiles: Profile[], key: string): Profile | undefined {
  const nickname = key.toLowerCase();
  return profiles.find(
    (profile) =>
      isSameAddress(profile.address, key) || profile.nickname?.toLowerCase() === nickname,
  );
}

export function compareWithProfile(
  profile: Profile,
  mode: ActiveCompare["cmp_mode"],
): ActiveCompare {
  return {
    cmp_type: "profile",
    cmp_to: nicknameParam(profile.address, profile.nickname),
    cmp_mode: mode,
  };
}
