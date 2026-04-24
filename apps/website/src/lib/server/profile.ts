import type { PublicProfile } from "@/lib/universal/user";

export function sanitizePublicProfile(
  profile: PublicProfile,
  currentUserId?: string,
): Omit<PublicProfile, "ownerId"> {
  const { ownerId, ...safeProfile } = profile;
  return {
    ...safeProfile,
    isOwned: ownerId && currentUserId ? ownerId === currentUserId : false,
  };
}
