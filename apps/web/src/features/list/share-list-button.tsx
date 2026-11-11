import { ShareNetworkIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { type ShareableList, useCopyListLink } from "./use-copy-list-link";

export function ShareListButton({ list }: { list: ShareableList }) {
  const copy = useCopyListLink(list);

  return (
    <Button variant="outline" size="sm" onClick={() => void copy()}>
      <ShareNetworkIcon />
      {m.list_copy_link()}
    </Button>
  );
}
