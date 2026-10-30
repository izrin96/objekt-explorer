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

export function PriceFields({
  currency,
  price,
  onPriceChange,
  isQyop,
  onQyopChange,
  note,
  onNoteChange,
}: {
  currency: string;
  price: number | null;
  onPriceChange: (price: number | null) => void;
  isQyop: boolean;
  onQyopChange: (isQyop: boolean) => void;
  note: string;
  onNoteChange: (note: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Label
        htmlFor="add-to-list-qyop"
        className="flex items-center justify-between gap-3 font-normal"
      >
        <span className="text-sm font-medium">{m.list_manage_objekt_set_price_qyop()}</span>
        <Switch id="add-to-list-qyop" checked={isQyop} onCheckedChange={onQyopChange} />
      </Label>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor="add-to-list-price">{m.list_manage_objekt_set_price_label()}</Label>
        <NumberField
          id="add-to-list-price"
          value={price}
          onValueChange={onPriceChange}
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
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor="add-to-list-note">{m.list_manage_objekt_set_price_note()}</Label>
        <Input
          id="add-to-list-note"
          maxLength={255}
          placeholder={m.list_manage_objekt_set_price_note_placeholder()}
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
        />
        <span className="text-muted-foreground text-xs text-pretty">{m.list_add_price_hint()}</span>
      </div>
    </div>
  );
}
