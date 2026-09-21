import { type ReactElement, useState } from "react";

import { notImplemented } from "@/components/shared/not-implemented";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldScrubArea,
} from "@/components/ui/number-field";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastManager } from "@/components/ui/toast";

const CURRENCIES = ["MYR", "USD", "KRW", "PHP"];

type Props = {
  count: number;
  /** a sale list's currency; when set it is shown as a fixed prefix, not a picker */
  currency?: string;
  /** persist the price; callers without a store just toast */
  onSave?: (price: number) => void;
  children: ReactElement;
};

/** "Set price" for the selection: cnippet NumberField with currency prefix Select. */
export function SetPriceDialog({ count, currency: fixed, onSave, children }: Props) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState<number | null>(10);
  const [picked, setPicked] = useState("MYR");
  const currency = fixed ?? picked;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogPopup className="max-w-sm">
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
            // a sale list stores the price; every other caller only says so
            const report = onSave === undefined ? notImplemented : toastManager.add;
            onSave?.(price ?? 0);
            report({
              type: "success",
              title: `Priced ${count} objekt${count === 1 ? "" : "s"}`,
              description: `${currency} ${(price ?? 0).toFixed(2)} each`,
            });
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display">Set price</DialogTitle>
            <DialogDescription>
              Applies to <span className="text-foreground font-mono">{count}</span> selected
              objekts.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <NumberField
              value={price}
              onValueChange={setPrice}
              min={0}
              step={1}
              largeStep={10}
              format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
            >
              <NumberFieldScrubArea label="Price" />
              <div className="flex w-full items-stretch">
                {fixed === undefined ? (
                  <Select value={picked} onValueChange={(v) => setPicked(v ?? "MYR")}>
                    <SelectTrigger
                      aria-label="Currency"
                      className="w-22 min-w-0 rounded-e-none border-e-0 font-mono"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c} className="font-mono">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                ) : (
                  <span className="bg-secondary text-muted-foreground grid w-22 place-items-center rounded-s-lg border border-e-0 font-mono text-sm">
                    {fixed}
                  </span>
                )}
                <NumberFieldGroup className="rounded-s-none">
                  <NumberFieldDecrement aria-label="Decrease" />
                  <NumberFieldInput className="font-mono" />
                  <NumberFieldIncrement aria-label="Increase" />
                </NumberFieldGroup>
              </div>
            </NumberField>
            <Label className="text-muted-foreground mt-3 block text-xs font-normal">
              Drag the "Price" label to scrub. Shift+arrow steps by 10.
            </Label>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button type="submit">Save price</Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
