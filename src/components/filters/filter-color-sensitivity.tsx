"use client";

import React, { CSSProperties, useEffect, useState } from "react";
import { useFilters } from "@/hooks/use-filters";
import { Button, Popover, Slider } from "../ui";
import { useDebounceValue } from "usehooks-ts";

export default function ColorSensitivityFilter() {
  const [filters, setFilters] = useFilters();
  const [sensitivity, setSensitivity] = useState(filters.colorSensitivity);
  const [debouncedValue] = useDebounceValue(sensitivity, 150);

  useEffect(() => {
    setFilters({
      colorSensitivity: debouncedValue === 7 ? null : debouncedValue,
    });
  }, [debouncedValue, setFilters]);

  useEffect(() => {
    if (!filters.colorSensitivity) {
      setSensitivity(null);
    }
  }, [filters.colorSensitivity]);

  return (
    <Popover>
      <Button intent="outline">Color Sensitivity</Button>
      <Popover.Content className="p-3">
        <Slider
          label="Color sensitivity"
          className="pb-2"
          minValue={0}
          maxValue={30}
          value={sensitivity ?? 7}
          onChange={(v) => setSensitivity(v as number)}
          step={0.1}
          style={
            {
              "--primary": filters.color,
            } as CSSProperties
          }
        />
      </Popover.Content>
    </Popover>
  );
}
