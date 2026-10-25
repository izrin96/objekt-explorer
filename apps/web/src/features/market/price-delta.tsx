import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

/** `change` is a fraction: 0.2 reads as 20.0%. */
export function PriceDelta({ change }: { change: number }) {
  const percent = new Intl.NumberFormat(getLocale(), {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(change));
  const up = change > 0;
  const down = change < 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5",
        up && "text-success",
        down && "text-destructive",
        !up && !down && "text-muted-foreground",
      )}
    >
      {up && <CaretUpIcon weight="fill" className="size-3" aria-hidden />}
      {down && <CaretDownIcon weight="fill" className="size-3" aria-hidden />}
      <span className="sr-only">
        {up
          ? m.objekt_market_change_up({ percent })
          : down
            ? m.objekt_market_change_down({ percent })
            : null}
      </span>
      <span aria-hidden={up || down || undefined}>{percent}</span>
    </span>
  );
}
