import { useQuery } from "@tanstack/react-query";

import { currentUserOptions } from "@/features/user/queries";
import { displayNickname, isSameAddress } from "@/lib/address";

/**
 * The name other people see the signed-in account by: its default profile, else its display
 * name, as the server's `chatIdentity` names it. `profileCount` decides whether there is a
 * default to change.
 */
export function useShownAs() {
  const { data } = useQuery(currentUserOptions);
  if (!data) return null;
  const profile = data.profiles.find((p) => isSameAddress(p.address, data.defaultAddress));
  return {
    name: profile ? displayNickname(profile.address, profile.nickname) : data.user.name,
    profileCount: data.profiles.length,
  };
}
