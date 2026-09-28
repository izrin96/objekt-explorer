import { ShareNetworkIcon } from "@phosphor-icons/react";
import type { PublicList } from "@repo/api/schemas/list";
import { useRouter } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { getBaseURL } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { getListLinkOption } from "./list-link";

type ShareableList = Pick<PublicList, "slug" | "profileSlug" | "profileAddress" | "profile">;

/** Copies the address the list actually lives at — the profile-scoped one when it is bound. */
export function useCopyListLink(list: ShareableList) {
  const router = useRouter();

  return async () => {
    const { href } = router.buildLocation(getListLinkOption(list));
    const url = new URL(href, getBaseURL()).toString();
    try {
      await navigator.clipboard.writeText(url);
      toastManager.add({ type: "success", title: m.list_share_copied(), description: url });
    } catch {
      toastManager.add({ type: "error", title: m.common_copy_blocked(), description: url });
    }
  };
}

export function ShareListButton({ list }: { list: ShareableList }) {
  const copy = useCopyListLink(list);

  return (
    <Button variant="outline" size="sm" onClick={() => void copy()}>
      <ShareNetworkIcon />
      {m.list_share()}
    </Button>
  );
}
