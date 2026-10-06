import {
  CaretLeftIcon,
  CaretLineLeftIcon,
  CaretLineRightIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import type { UseQueryResult } from "@tanstack/react-query";
import { type ReactNode, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberField, NumberFieldGroup, NumberFieldInput } from "@/components/ui/number-field";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { m } from "@/paraglide/messages";

import { type Stat, StatRow } from "./stat-row";

const SCOPES = ["all", "spun", "kept"] as const;
type SerialScope = (typeof SCOPES)[number];

const isScope = (value: string): value is SerialScope => SCOPES.some((scope) => scope === value);

const SCOPE_LABEL: Record<SerialScope, () => string> = {
  all: m.filter_all,
  spun: m.objekt_event_spun,
  kept: m.objekt_non_spin,
};

/**
 * Previous and next snap to the nearest *existing* serial, never to `serial ± 1`,
 * and only within the scope picked: every serial, the spun ones, or the rest.
 */
export function SerialsPanel({
  serial,
  serials,
  spun,
  metadata,
  physical,
  loading,
  onSerialChange,
  children,
}: {
  serial: number | null;
  serials: number[];
  /** the serials COSMO Spin holds, ascending */
  spun: number[];
  metadata: UseQueryResult<{ total: number; spin: number; transferable: number }>;
  /** a physical objekt's copies only exist once scanned, so its total counts scans */
  physical: boolean;
  loading: boolean;
  onSerialChange: (serial: number) => void;
  children: ReactNode;
}) {
  const [scope, setScope] = useState<SerialScope>("all");
  const spunSet = useMemo(() => new Set(spun), [spun]);

  const serialsIn = (target: SerialScope) =>
    target === "all"
      ? serials
      : target === "spun"
        ? spun
        : serials.filter((value) => !spunSet.has(value));
  const scoped = serialsIn(scope);

  const updateSerial = (mode: "first" | "prev" | "next" | "last") => {
    if (scoped.length === 0) return;
    const current = serial ?? 0;
    if (mode === "first") return onSerialChange(scoped[0] ?? current);
    if (mode === "last") return onSerialChange(scoped[scoped.length - 1] ?? current);
    // past either end, every serial can still reach one the list has not caught
    // up with yet; a narrowed scope stops at its ends
    if (mode === "prev") {
      const found = scoped.findLast((value) => value < current);
      if (found !== undefined) return onSerialChange(found);
      if (scope === "all") onSerialChange(current > 1 ? current - 1 : 1);
      return;
    }
    const found = scoped.find((value) => value > current);
    if (found !== undefined) return onSerialChange(found);
    if (scope === "all") onSerialChange(current + 1);
  };

  // a serial outside the new scope moves to the next one inside it
  const changeScope = (next: SerialScope) => {
    setScope(next);
    const list = serialsIn(next);
    if (serial !== null && list.includes(serial)) return;
    const target = list.find((value) => value > (serial ?? 0)) ?? list[0];
    if (target !== undefined) onSerialChange(target);
  };

  const scopeEmpty: Record<SerialScope, boolean> = {
    all: serials.length === 0,
    spun: spun.length === 0,
    kept: spun.length === serials.length,
  };

  // the stats come from their own query, so they show while the serials load
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <SerialStats metadata={metadata} physical={physical} />
        <div className="flex flex-col gap-3" role="status">
          {/* a live region announces its content, so the label has to be in it */}
          <span className="sr-only">{m.objekt_serials_loading()}</span>
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-21 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SerialStats metadata={metadata} physical={physical} />
      <div className="flex items-center gap-1.5">
        <NumberField
          value={serial}
          // null is an empty input, not "no serial"; 0 keeps the field usable
          onValueChange={(value) => onSerialChange(value ?? 0)}
          min={0}
          size="sm"
          className="min-w-0 grow"
        >
          <NumberFieldGroup>
            <NumberFieldInput
              aria-label={m.objekt_serial_aria()}
              className="text-left font-mono"
              placeholder={m.objekt_serial()}
            />
          </NumberFieldGroup>
        </NumberField>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={m.trade_view_serial_first_aria()}
          onClick={() => updateSerial("first")}
        >
          <CaretLineLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={m.trade_view_serial_previous_aria()}
          onClick={() => updateSerial("prev")}
        >
          <CaretLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={m.trade_view_serial_next_aria()}
          onClick={() => updateSerial("next")}
        >
          <CaretRightIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={m.trade_view_serial_last_aria()}
          onClick={() => updateSerial("last")}
        >
          <CaretLineRightIcon />
        </Button>
      </div>

      {/* single choice, so pressing the active scope again (an empty group) is ignored */}
      <ToggleGroup
        variant="outline"
        size="sm"
        aria-label={m.objekt_serial_scope_aria()}
        value={[scope]}
        onValueChange={([next]) => {
          if (next !== undefined && isScope(next)) changeScope(next);
        }}
      >
        {SCOPES.map((value) => (
          <ToggleGroupItem
            key={value}
            value={value}
            disabled={scopeEmpty[value] && scope !== value}
            className="text-muted-foreground data-pressed:text-foreground h-7 sm:h-6 sm:text-xs"
          >
            {SCOPE_LABEL[value]()}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {children}
    </div>
  );
}

/** The collection's counts, laid out like the market tab's floor, listings and sellers. */
function SerialStats({
  metadata,
  physical,
}: {
  metadata: UseQueryResult<{ total: number; spin: number; transferable: number }>;
  physical: boolean;
}) {
  if (metadata.isError) {
    return (
      <Badge variant="error" size="sm" className="self-start">
        {m.objekt_error_fetching_metadata()}
      </Badge>
    );
  }

  const data = metadata.data;
  const stats: Stat[] = [
    {
      label: physical ? m.objekt_scanned_copies() : m.objekt_copies(),
      value: data ? data.total.toLocaleString() : null,
    },
    {
      label: m.objekt_event_spun(),
      value: data ? data.spin.toLocaleString() : null,
    },
    {
      label: m.objekt_non_spin(),
      value: data ? (data.total - data.spin).toLocaleString() : null,
    },
    {
      label: m.objekt_transferable(),
      value: data
        ? data.total > 0
          ? `${((data.transferable / data.total) * 100).toFixed(2)}%`
          : "—"
        : null,
      detail: data?.transferable.toLocaleString(),
    },
  ];

  // Transferable carries a percentage and a count, so it takes the width it
  // needs and the three single figures share the rest
  return (
    <StatRow stats={stats} className="grid-cols-2 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]" />
  );
}
