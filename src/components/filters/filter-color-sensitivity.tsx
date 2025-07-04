"use client";

import { useTranslations } from "next-intl";
import { type CSSProperties, useEffect, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { useFilters } from "@/hooks/use-filters";
import { Button, Popover, Slider } from "../ui";

export default function ColorSensitivityFilter() {
  const t = useTranslations("filter");
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
      <Button intent="outline">{t("color_sensitivity")}</Button>
      <Popover.Content className="p-3">
        <Slider
          label={t("color_sensitivity")}
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
