import type { PublicProfile } from "@repo/api/schemas/profile";
import { type PropsWithChildren } from "react";

import { ProfileContext } from "./use-profile";

export function ProfileProvider({
  profile,
  children,
}: PropsWithChildren<{ profile: PublicProfile }>) {
  return <ProfileContext value={profile}>{children}</ProfileContext>;
}
