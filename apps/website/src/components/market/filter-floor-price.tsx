import { useCurrency } from "@/hooks/use-currency";
import { useFilters } from "@/hooks/use-filters";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { Label } from "../intentui/field";
import { NumberField, NumberInput } from "../intentui/number-field";
import { Popover, PopoverBody, PopoverContent } from "../intentui/popover";

export default function FloorPriceFilter() {
  const [filters, setFilters] = useFilters();
  const { currency, fromUsd, toUsd } = useCurrency();
  const isActive = filters.floor_min !== null || filters.floor_max !== null;

  // URL params stay in USD so shared links mean the same for everyone;
  // the inputs show and accept the preferred currency
  const display = (usd: number | null) => (usd === null ? NaN : fromUsd(usd));
  const store = (amount: number) =>
    Number.isNaN(amount) ? null : Number(toUsd(amount).toPrecision(6));

  return (
    <Popover>
      <Button intent="outline" data-selected={isActive ? true : undefined}>
        {m.filter_floor_price()}
      </Button>
      <PopoverContent>
        <PopoverBody className="flex w-64 flex-col gap-3 py-3 [--gutter:--spacing(4)]">
          <NumberField
            minValue={0}
            value={display(filters.floor_min)}
            onChange={(value) => setFilters({ floor_min: store(value) })}
            formatOptions={{ style: "currency", currency }}
          >
            <Label>{m.filter_floor_min({ currency })}</Label>
            <NumberInput />
          </NumberField>

          <NumberField
            minValue={0}
            value={display(filters.floor_max)}
            onChange={(value) => setFilters({ floor_max: store(value) })}
            formatOptions={{ style: "currency", currency }}
          >
            <Label>{m.filter_floor_max({ currency })}</Label>
            <NumberInput />
          </NumberField>

          <Button
            size="sm"
            intent="outline"
            isDisabled={!isActive}
            onPress={() => setFilters({ floor_min: null, floor_max: null })}
          >
            {m.filter_floor_clear()}
          </Button>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
