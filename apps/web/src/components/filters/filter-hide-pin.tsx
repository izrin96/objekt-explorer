"use client";

import { useIntlayer } from "next-intlayer";

import { useFilters } from "@/hooks/use-filters";

import { Toggle } from "../intentui/toggle";

export default function HidePinFilter() {
  const content = useIntlayer("filter");
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      isSelected={filters.hidePin ?? false}
      onChange={(v) =>
        setFilters({
          hidePin: !v ? null : true,
        })
      }
    >
      {content.disable_pin.value}
    </Toggle>
  );
}
