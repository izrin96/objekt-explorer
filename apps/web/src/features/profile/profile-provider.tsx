import type { PublicProfile } from "@repo/api/schemas/user";
import { createContext, use, type PropsWithChildren } from "react";

import { useUserProfiles } from "@/features/user/hooks";
import { useColumns, useColumnStore } from "@/stores/columns";

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
  return profiles.some((p) => p.address.toLowerCase() === target.address.toLowerCase());
}

/** The owner's configured column count stands in for the viewport default, until the viewer picks one of their own. */
export function useProfileColumns(): number {
  const profile = useProfileTarget();
  const responsive = useColumns();
  const picked = useColumnStore((s) => !s.initial);
  return !picked && profile?.gridColumns ? profile.gridColumns : responsive;
}
