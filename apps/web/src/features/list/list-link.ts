import type { PublicList } from "@repo/api/schemas/list";
import type { PublicProfile } from "@repo/api/schemas/user";
import { linkOptions } from "@tanstack/react-router";

/** A market listing carries the profile without the address beside it, so both are optional. */
type ListLinkTarget = Pick<PublicList, "slug" | "profileSlug"> & {
  profileAddress?: string | null;
  profile?: Pick<PublicProfile, "nickname" | "address"> | null;
};

/**
 * A list filed under a Cosmo lives at the profile-scoped address; `/list/<slug>`
 * only redirects there. The test is the address, never `isProfileBind`, which
 * decides display on that profile and nothing about where the list lives.
 */
export function getListLinkOption(list: ListLinkTarget) {
  const address = list.profileAddress ?? list.profile?.address ?? null;

  if (address && list.profileSlug) {
    return linkOptions({
      to: "/@{$nickname}/list/$slug",
      params: {
        nickname: list.profile?.nickname || address.toLowerCase(),
        slug: list.profileSlug,
      },
    });
  }

  return linkOptions({ to: "/list/$slug", params: { slug: list.slug } });
}
