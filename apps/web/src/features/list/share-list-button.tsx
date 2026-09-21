import { ShareNetworkIcon } from "@phosphor-icons/react";
import type { PublicList } from "@repo/api/schemas/list";
import { useRouter } from "@tanstack/react-router";

import { Button, type ButtonProps } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { getBaseURL } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { getListLinkOption } from "./list-link";

/** Copies the address the list actually lives at — the profile-scoped one when it is bound. */
export function ShareListButton({
  list,
  size = "sm",
}: {
  list: Pick<PublicList, "slug" | "profileSlug" | "profileAddress" | "profile">;
  size?: ButtonProps["size"];
}) {
  const router = useRouter();

  const copy = async () => {
    const { href } = router.buildLocation(getListLinkOption(list));
    const url = new URL(href, getBaseURL()).toString();
    try {
      await navigator.clipboard.writeText(url);
      toastManager.add({ type: "success", title: m.list_share_copied(), description: url });
    } catch {
      toastManager.add({ type: "error", title: m.common_copy_blocked(), description: url });
    }
  };

  return (
    <Button variant="outline" size={size} onClick={() => void copy()}>
      <ShareNetworkIcon />
      {m.list_share()}
    </Button>
  );
}
