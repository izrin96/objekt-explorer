import type { ValidObjekt } from "@repo/lib/types/objekt";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";
import { Switch } from "@/components/ui/switch";
import { m } from "@/paraglide/messages";

import { useUpdateEntryPrices } from "./actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** list entries; `id` is the entry id `updateEntryPrices` writes against */
  objekts: ValidObjekt[];
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
  const [price, setPrice] = useState<number | null>(first?.price ?? null);
  const [isQyop, setIsQyop] = useState(first?.isQyop ?? false);
  const [note, setNote] = useState(first?.note ?? "");

  const entryIds = objekts.map((objekt) => Number(objekt.id));
  const save = (updates: Update[]) => update.mutate({ slug, updates }, { onSuccess: onDone });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">{m.list_manage_objekt_set_price_title()}</DialogTitle>
        <DialogDescription>
          {m.list_manage_objekt_set_price_desc()} ({currency})
        </DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <Label
          htmlFor="set-price-qyop"
          className="flex items-center justify-between gap-3 font-normal"
        >
          <span className="text-sm font-medium">{m.list_manage_objekt_set_price_qyop()}</span>
          <Switch id="set-price-qyop" checked={isQyop} onCheckedChange={setIsQyop} />
        </Label>

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="set-price-value">{m.list_manage_objekt_set_price_label()}</Label>
          <NumberField
            id="set-price-value"
            value={price}
            onValueChange={setPrice}
            min={0}
            step={1}
            largeStep={10}
            disabled={isQyop}
            format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          >
            <div className="flex w-full items-stretch">
              <span className="bg-secondary text-muted-foreground grid w-20 shrink-0 place-items-center rounded-s-lg border border-e-0 font-mono text-sm">
                {currency}
              </span>
              <NumberFieldGroup className="rounded-s-none">
                <NumberFieldDecrement aria-label={m.filter_sort_by_price_label()} />
                <NumberFieldInput className="font-mono tabular-nums" />
                <NumberFieldIncrement aria-label={m.filter_sort_by_price_label()} />
              </NumberFieldGroup>
            </div>
          </NumberField>
          <span className="text-muted-foreground text-xs">
            {m.list_manage_objekt_set_price_clear_hint()}
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="set-price-note">{m.list_manage_objekt_set_price_note()}</Label>
          <Input
            id="set-price-note"
            maxLength={255}
            placeholder={m.list_manage_objekt_set_price_note_placeholder()}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button
          variant="secondary"
          loading={update.isPending}
          onClick={() =>
            save(entryIds.map((entryId) => ({ entryId, price: null, isQyop: false, note: null })))
          }
        >
          {m.list_manage_objekt_set_price_clear()}
        </Button>
        <Button
          loading={update.isPending}
          onClick={() =>
            save(
              entryIds.map((entryId) => ({
                entryId,
                price: isQyop ? null : (price ?? null),
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
