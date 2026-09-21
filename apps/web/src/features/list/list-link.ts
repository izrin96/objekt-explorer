import type { PublicList } from "@repo/api/schemas/list";
import { linkOptions } from "@tanstack/react-router";

/**
 * A list filed under a Cosmo lives at the profile-scoped address; `/list/<slug>`
 * only redirects there. The test is the address, never `isProfileBind`, which
 * decides display on that profile and nothing about where the list lives.
 */
export function getListLinkOption(
  list: Pick<PublicList, "slug" | "profileSlug" | "profileAddress" | "profile">,
) {
  if (list.profileAddress && list.profileSlug) {
    return linkOptions({
      to: "/@{$nickname}/list/$slug",
      params: {
        nickname: list.profile?.nickname || list.profileAddress.toLowerCase(),
        slug: list.profileSlug,
      },
    });
  }

  return linkOptions({ to: "/list/$slug", params: { slug: list.slug } });
}
