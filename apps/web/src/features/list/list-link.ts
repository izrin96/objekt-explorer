import type { PublicList } from "@repo/api/schemas/list";
import type { PublicProfile } from "@repo/api/schemas/profile";
import { linkOptions } from "@tanstack/react-router";

import { nicknameParam } from "@/lib/address";

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
        nickname: nicknameParam(address, list.profile?.nickname),
        slug: list.profileSlug,
      },
    });
  }

  return linkOptions({ to: "/list/$slug", params: { slug: list.slug } });
}

/**
 * The Trade post page a list on Trade is in, under its Cosmo profile's address, or its linked
 * list's when it has none (a want list), or else its owner's Trade handle (an unbound want list).
 * The person page redirects the address to the handle and a pair's want half to its anchor's
 * slug. Null with none of them, which has no page.
 */
export function tradePostLink(
  list: Pick<PublicList, "slug" | "profileAddress" | "tradeHandle"> & {
    linkedList?: Pick<PublicList, "profileAddress"> | null;
  },
) {
  const handle = list.profileAddress ?? list.linkedList?.profileAddress ?? list.tradeHandle ?? null;
  if (!handle) return null;
  return linkOptions({
    to: "/trade/@{$handle}/$slug",
    params: { handle: handle.toLowerCase(), slug: list.slug },
  });
}
