import { PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AddToListModal, RemoveFromListModal } from "@/components/list/modal/manage-objekt";
import { Button } from "@/components/ui/button";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import type { ObjektActionProps } from "./common";

export function AddToList({ size }: ObjektActionProps) {
  const t = useTranslations("filter");
  const [addOpen, setAddOpen] = useState(false);
  const handleAction = useObjektSelect((a) => a.handleAction);
  return (
    <>
      <AddToListModal open={addOpen} setOpen={setAddOpen} />
      <Button size={size} intent="outline" onClick={() => handleAction(() => setAddOpen(true))}>
        <PlusIcon weight="regular" data-slot="icon" />
        {t("add_to_list")}
      </Button>
    </>
  );
}

export function RemoveFromList({ size }: ObjektActionProps) {
  const t = useTranslations("filter");
  const [open, setOpen] = useState(false);
  const handleAction = useObjektSelect((a) => a.handleAction);
  return (
    <>
      <RemoveFromListModal open={open} setOpen={setOpen} />
      <Button size={size} intent="outline" onClick={() => handleAction(() => setOpen(true))}>
        <TrashSimpleIcon weight="regular" data-slot="icon" />
        {t("remove_from_list")}
      </Button>
    </>
  );
}
