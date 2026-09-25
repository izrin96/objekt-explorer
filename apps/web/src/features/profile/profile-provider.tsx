import type { PublicProfile } from "@repo/api/schemas/user";
import { createContext, use, type PropsWithChildren } from "react";

import { useUserProfiles } from "@/features/user/hooks";
import { isSameAddress } from "@/lib/address";
import { useColumns } from "@/stores/columns";

const ProfileContext = createContext<PublicProfile | null>(null);

export function ProfileProvider({
  profile,
  children,
}: PropsWithChildren<{ profile: PublicProfile }>) {
  return <ProfileContext value={profile}>{children}</ProfileContext>;
}

export function useProfileTarget(): PublicProfile | null {
  return use(ProfileContext);
}

/** the signed-in account owns the Cosmo this page is about, so it may edit it */
export function useProfileAuthed(): boolean {
  const target = useProfileTarget();
  const profiles = useUserProfiles();
  if (!target) return false;
  return profiles.some((p) => isSameAddress(p.address, target.address));
}

/** The owner's configured column count is ignored while the Objekt Columns setting is removed; the viewer's own count applies. */
export function useProfileColumns(): number {
  // const profile = useProfileTarget();
  // const picked = useColumnStore((s) => !s.initial);
  // return !picked && profile?.gridColumns ? profile.gridColumns : responsive;
  return useColumns();
}
