import { type ReactNode, useId } from "react";

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

export type PriceValue = { price: number | null; isQyop: boolean; note: string };

/** A sale entry's QYOP switch, price and note, bare: the parent lays them out. */
export function PriceFields({
  currency,
  value,
  onChange,
  priceHint,
  noteHint,
}: {
  currency: string;
  value: PriceValue;
  onChange: (next: PriceValue) => void;
  /** under the price */
  priceHint?: ReactNode;
  /** under the note */
  noteHint?: ReactNode;
}) {
  const id = useId();
  const { price, isQyop, note } = value;
  return (
    <>
      <Label htmlFor={`${id}-qyop`} className="flex items-center justify-between gap-3 font-normal">
        <span className="text-sm font-medium">{m.list_manage_objekt_set_price_qyop()}</span>
        <Switch
          id={`${id}-qyop`}
          checked={isQyop}
          onCheckedChange={(next) => onChange({ ...value, isQyop: next })}
        />
      </Label>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={`${id}-price`}>{m.list_manage_objekt_set_price_label()}</Label>
        <NumberField
          id={`${id}-price`}
          value={price}
          onValueChange={(next) => onChange({ ...value, price: next })}
          min={0}
          step={1}
          largeStep={10}
          disabled={isQyop}
          format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
        >
          <div className="flex w-full items-stretch">
            <span className="bg-secondary text-muted-foreground grid w-20 shrink-0 place-items-center rounded-s-lg border border-e-0 text-sm">
              {currency}
            </span>
            <NumberFieldGroup className="rounded-s-none before:rounded-s-none">
              <NumberFieldDecrement
                className="rounded-s-none"
                aria-label={m.filter_sort_by_price_label()}
              />
              <NumberFieldInput className="tabular-nums" />
              <NumberFieldIncrement aria-label={m.filter_sort_by_price_label()} />
            </NumberFieldGroup>
          </div>
        </NumberField>
        {priceHint}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={`${id}-note`}>{m.list_manage_objekt_set_price_note()}</Label>
        <Input
          id={`${id}-note`}
          maxLength={255}
          placeholder={m.list_manage_objekt_set_price_note_placeholder()}
          value={note}
          onChange={(event) => onChange({ ...value, note: event.target.value })}
        />
        {noteHint}
      </div>
    </>
  );
}
