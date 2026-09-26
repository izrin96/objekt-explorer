import { CurrencyDollarIcon } from "@phosphor-icons/react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumberField, NumberFieldGroup, NumberFieldInput } from "@/components/ui/number-field";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { useFilters, useSetFilters } from "@/features/filters/use-filters";
import { useCurrency } from "@/features/settings/use-currency";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/**
 * The URL stays in USD so a shared link means the same range for everyone,
 * while the inputs show and accept the viewer's currency. Both directions use
 * the one rate, so a value typed here survives a round trip.
 */
export function FloorPriceFilter({ className }: { className?: string }) {
  const floorMin = useFilters((f) => f.floor_min);
  const floorMax = useFilters((f) => f.floor_max);
  const setFilters = useSetFilters();
  const { currency, fromUsd, toUsd } = useCurrency();

  const active = floorMin !== undefined || floorMax !== undefined;
  const display = (usd: number | undefined) => (usd === undefined ? null : fromUsd(usd));
  const store = (amount: number | null) =>
    amount === null || Number.isNaN(amount) ? undefined : Number(toUsd(amount).toPrecision(6));

  return (
    <Popover>
      <PopoverTrigger
        aria-label={m.filter_floor_price()}
        data-active={active || undefined}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "data-active:border-foreground gap-1.5",
          className,
        )}
      >
        <CurrencyDollarIcon />
        {m.filter_floor_price()}
      </PopoverTrigger>
      <PopoverPopup className="w-64">
        <div className="flex flex-col gap-3">
          <NumberField
            min={0}
            size="sm"
            value={display(floorMin)}
            onValueChange={(value) => setFilters({ floor_min: store(value) })}
          >
            <Label>{m.filter_floor_min({ currency })}</Label>
            <NumberFieldGroup>
              <NumberFieldInput className="tabular-nums" />
            </NumberFieldGroup>
          </NumberField>

          <NumberField
            min={0}
            size="sm"
            value={display(floorMax)}
            onValueChange={(value) => setFilters({ floor_max: store(value) })}
          >
            <Label>{m.filter_floor_max({ currency })}</Label>
            <NumberFieldGroup>
              <NumberFieldInput className="tabular-nums" />
            </NumberFieldGroup>
          </NumberField>

          <Button
            variant="outline"
            size="sm"
            disabled={!active}
            onClick={() => setFilters({ floor_min: undefined, floor_max: undefined })}
          >
            {m.filter_floor_clear()}
          </Button>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
