import { TRADE_RATIOS } from "@repo/api/schemas/trade-ratio";
import { useId } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { m } from "@/paraglide/messages";

import { type RatioSide, ratioName, ratioText } from "./ratio-text";

const NONE = "1";

/** 1:1 (null) or 2 to 5, shown in the owner's give:get for `side`. */
export function RatioPicker({
  value,
  onChange,
  side,
  label,
  description,
  listRatio = null,
  disabled = false,
}: {
  value: number | null;
  onChange: (ratio: number | null) => void;
  side: RatioSide;
  label: string;
  description?: string;
  /** for an entry or rule: the list's Ratio for all, which null follows */
  listRatio?: number | null;
  /** while a save from it is in flight */
  disabled?: boolean;
}) {
  const id = useId();
  const inherited = listRatio === null ? null : ratioText(listRatio, side);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span id={`${id}-label`} className="text-sm font-medium">
        {label}
      </span>
      {description ? (
        <p id={`${id}-desc`} className="text-muted-foreground -mt-0.5 text-xs text-pretty">
          {description}
        </p>
      ) : null}
      <ToggleGroup
        variant="outline"
        size="sm"
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        value={[value === null ? NONE : String(value)]}
        onValueChange={([next]) => {
          if (next === undefined) return;
          onChange(next === NONE ? null : Number(next));
        }}
      >
        {/* each name starts with the visible text, so a voice command naming it still works */}
        <ToggleGroupItem
          value={NONE}
          aria-label={
            inherited === null
              ? m.ratio_none_name()
              : m.ratio_same_as_list_name({ ratio: inherited })
          }
          className="tabular-nums"
        >
          {inherited === null ? "1:1" : m.ratio_same_as_list()}
        </ToggleGroupItem>
        {TRADE_RATIOS.map((ratio) => (
          <ToggleGroupItem
            key={ratio}
            value={String(ratio)}
            aria-label={m.ratio_option_name({
              ratio: ratioText(ratio, side),
              name: ratioName(ratio, side, { owner: true }),
            })}
            className="tabular-nums"
          >
            {ratioText(ratio, side)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
