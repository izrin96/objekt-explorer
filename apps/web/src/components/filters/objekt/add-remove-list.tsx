import { CurrencyDollarIcon, PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { AddToListModal, RemoveFromListModal } from "@/components/list/modal/manage-objekt";
import { SetPriceModal } from "@/components/list/modal/set-price-modal";
import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { useObjektSelect } from "@/hooks/use-objekt-select";

export function AddToList({ size, address }: { size?: ButtonProps["size"]; address?: string }) {
  const t = useTranslations("filter");
  const [addOpen, setAddOpen] = useState(false);
  const handleAction = useObjektSelect((a) => a.handleAction);
  return (
    <>
      <AddToListModal open={addOpen} setOpen={setAddOpen} address={address} />
      <Button size={size} intent="outline" onPress={() => handleAction(() => setAddOpen(true))}>
        <PlusIcon weight="regular" data-slot="icon" />
        {t("add_to_list")}
      </Button>
    </>
  );
}

export function RemoveFromList({ size }: { size?: ButtonProps["size"] }) {
  const t = useTranslations("filter");
  const [open, setOpen] = useState(false);
  const handleAction = useObjektSelect((a) => a.handleAction);
  return (
    <>
      <RemoveFromListModal open={open} setOpen={setOpen} />
      <Button size={size} intent="outline" onPress={() => handleAction(() => setOpen(true))}>
        <TrashSimpleIcon weight="regular" data-slot="icon" />
        {t("remove_from_list")}
      </Button>
    </>
  );
}

export function SetPrice({ size }: { size?: ButtonProps["size"] }) {
  const t = useTranslations("filter");
  const [open, setOpen] = useState(false);
  const handleAction = useObjektSelect((a) => a.handleAction);
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  return (
    <>
      <SetPriceModal open={open} setOpen={setOpen} objekts={selected} />
      <Button size={size} intent="outline" onPress={() => handleAction(() => setOpen(true))}>
        <CurrencyDollarIcon weight="regular" data-slot="icon" />
        {t("set_price")}
      </Button>
    </>
  );
}
