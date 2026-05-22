import { TrashSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

import type { ButtonProps } from "@/components/intentui/button";
import { Button } from "@/components/intentui/button";
import { RemoveFromListModal } from "@/components/list/modal/remove-from-list-modal";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { m } from "@/paraglide/messages";

export function RemoveFromList({ size }: { size?: ButtonProps["size"] }) {
  const [open, setOpen] = useState(false);
  const handleAction = useObjektSelect((a) => a.handleAction);
  return (
    <>
      <RemoveFromListModal open={open} setOpen={setOpen} />
      <Button size={size} intent="outline" onPress={() => handleAction(() => setOpen(true))}>
        <TrashSimpleIcon weight="regular" />
        {m.filter_remove_from_list()}
      </Button>
    </>
  );
}
