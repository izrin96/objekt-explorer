import { PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import {
  AddToListModal,
  RemoveFromListModal,
  RemoveFromProfileListModal,
} from "@/components/list/modal/manage-objekt";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useObjektSelect } from "@/hooks/use-objekt-select";

export function AddToList({ size }: ButtonProps) {
  const [addOpen, setAddOpen] = useState(false);
  const handleAction = useObjektSelect((a) => a.handleAction);
  return (
    <>
      <AddToListModal open={addOpen} setOpen={setAddOpen} />
      <Button size={size} intent="outline" onClick={() => handleAction(() => setAddOpen(true))}>
        <PlusIcon weight="regular" data-slot="icon" />
        Add to list
      </Button>
    </>
  );
}

export function RemoveFromList({ size }: ButtonProps) {
  const [open, setOpen] = useState(false);
  const handleAction = useObjektSelect((a) => a.handleAction);
  return (
    <>
      <RemoveFromListModal open={open} setOpen={setOpen} />
      <Button size={size} intent="outline" onClick={() => handleAction(() => setOpen(true))}>
        <TrashSimpleIcon weight="regular" data-slot="icon" />
        Remove from list
      </Button>
    </>
  );
}

export function RemoveFromProfileList({ size }: ButtonProps) {
  const [open, setOpen] = useState(false);
  const handleAction = useObjektSelect((a) => a.handleAction);
  return (
    <>
      <RemoveFromProfileListModal open={open} setOpen={setOpen} />
      <Button size={size} intent="outline" onClick={() => handleAction(() => setOpen(true))}>
        <TrashSimpleIcon weight="regular" data-slot="icon" />
        Remove from list
      </Button>
    </>
  );
}
