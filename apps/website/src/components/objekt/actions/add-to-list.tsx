import { PlusIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

import type { ButtonProps } from "@/components/intentui/button";
import { Button } from "@/components/intentui/button";
import { AddToListModal } from "@/components/list/modal/add-to-list-modal";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { m } from "@/paraglide/messages";

export function AddToList({ size, address }: { size?: ButtonProps["size"]; address?: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const handleAction = useObjektSelect((a) => a.handleAction);
  return (
    <>
      <AddToListModal open={addOpen} setOpen={setAddOpen} address={address} />
      <Button size={size} intent="outline" onPress={() => handleAction(() => setAddOpen(true))}>
        <PlusIcon weight="regular" />
        {m.filter_add_to_list()}
      </Button>
    </>
  );
}
