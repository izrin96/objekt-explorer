import type { ListObjekt } from "@repo/lib/types/objekt";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { m } from "@/paraglide/messages";

import { useUpdateEntryPrices } from "./actions";
import { PriceFields, type PriceValue } from "./price-fields";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objekts: ListObjekt[];
  slug: string;
  currency: string;
};

export function SetPriceDialog({ open, onOpenChange, objekts, slug, currency }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-sm">
        <SetPriceForm
          objekts={objekts}
          slug={slug}
          currency={currency}
          onDone={() => onOpenChange(false)}
        />
      </DialogPopup>
    </Dialog>
  );
}

type Update = { entryId: number; price: number | null; isQyop: boolean; note: string | null };

/**
 * Mounted with the popup, so each opening starts from whatever the first
 * selected entry already carries.
 */
function SetPriceForm({
  objekts,
  slug,
  currency,
  onDone,
}: Omit<Props, "open" | "onOpenChange"> & { onDone: () => void }) {
  const update = useUpdateEntryPrices();
  const first = objekts[0];
  const [value, setValue] = useState<PriceValue>({
    price: first?.price ?? null,
    isQyop: first?.isQyop ?? false,
    note: first?.note ?? "",
  });
  const { price, isQyop, note } = value;

  const entryIds = objekts.map((objekt) => objekt.entryId);
  const save = (updates: Update[]) => update.mutate({ slug, updates }, { onSuccess: onDone });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">{m.list_manage_objekt_set_price_title()}</DialogTitle>
        <DialogDescription>{m.list_manage_objekt_set_price_desc({ currency })}</DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <PriceFields
          currency={currency}
          value={value}
          onChange={setValue}
          priceHint={
            <span className="text-muted-foreground text-xs">
              {m.list_manage_objekt_set_price_clear_hint()}
            </span>
          }
        />
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button
          loading={update.isPending}
          onClick={() =>
            save(
              entryIds.map((entryId) => ({
                entryId,
                // 0 clears the price, as the field's hint says
                price: isQyop || !price ? null : price,
                isQyop,
                note: note.trim() || null,
              })),
            )
          }
        >
          {m.common_actions_save()}
        </Button>
      </DialogFooter>
    </>
  );
}
