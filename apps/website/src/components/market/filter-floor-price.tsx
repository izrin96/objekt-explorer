import { useFilters } from "@/hooks/use-filters";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { Label } from "../intentui/field";
import { NumberField, NumberInput } from "../intentui/number-field";
import { Popover, PopoverBody, PopoverContent } from "../intentui/popover";

export default function FloorPriceFilter() {
  const [filters, setFilters] = useFilters();
  const isActive = filters.floor_min !== null || filters.floor_max !== null;

  return (
    <Popover>
      <Button intent="outline" data-selected={isActive ? true : undefined}>
        {m.filter_floor_price()}
      </Button>
      <PopoverContent>
        <PopoverBody className="flex w-64 flex-col gap-3 py-3 [--gutter:--spacing(4)]">
          <NumberField
            minValue={0}
            step={0.5}
            value={filters.floor_min ?? undefined}
            onChange={(value) => setFilters({ floor_min: Number.isNaN(value) ? null : value })}
            formatOptions={{ style: "currency", currency: "USD" }}
          >
            <Label>{m.filter_floor_min()}</Label>
            <NumberInput />
          </NumberField>

          <NumberField
            minValue={0}
            step={0.5}
            value={filters.floor_max ?? undefined}
            onChange={(value) => setFilters({ floor_max: Number.isNaN(value) ? null : value })}
            formatOptions={{ style: "currency", currency: "USD" }}
          >
            <Label>{m.filter_floor_max()}</Label>
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
