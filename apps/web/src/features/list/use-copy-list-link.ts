import type { PublicList } from "@repo/api/schemas/list";
import { useRouter } from "@tanstack/react-router";

import { copyWithToast } from "@/lib/clipboard";
import { siteOrigin } from "@/lib/site-origin";
import { m } from "@/paraglide/messages";

import { getListLinkOption } from "./list-link";

type ShareableList = Pick<PublicList, "slug" | "profileSlug" | "profileAddress" | "profile">;

/** Copies the address the list actually lives at — the profile-scoped one when it is bound. */
export function useCopyListLink(list: ShareableList) {
  const router = useRouter();

  return async () => {
    const { href } = router.buildLocation(getListLinkOption(list));
    const url = new URL(href, siteOrigin()).toString();
    await copyWithToast(url, { title: m.list_share_copied(), description: url });
  };
}
