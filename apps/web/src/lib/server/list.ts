import type { PublicList } from "@/lib/universal/user";

export function sanitizePublicList(
  list: PublicList,
  currentUserId?: string,
): Omit<PublicList, "ownerId"> {
  const { ownerId, ...safeList } = list;
  return {
    ...safeList,
    isOwned: ownerId && currentUserId ? ownerId === currentUserId : false,
  };
}
