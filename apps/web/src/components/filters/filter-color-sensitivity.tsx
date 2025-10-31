"use client";

import { useTranslations } from "next-intl";
import { type CSSProperties, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { useFilters } from "@/hooks/use-filters";
import { Button } from "../ui/button";
import { Label } from "../ui/field";
import { Popover, PopoverContent } from "../ui/popover";
import { Slider, SliderFill, SliderOutput, SliderThumb, SliderTrack } from "../ui/slider";

export default function ColorSensitivityFilter() {
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();

  return (
    <Popover>
      <Button intent="outline">{t("color_sensitivity")}</Button>
      <PopoverContent className="p-3">
        <ColorSensitivitySlider
          initialValue={filters.colorSensitivity ?? 7}
          color={filters.color}
          onCommit={(value) => setFilters({ colorSensitivity: value === 7 ? null : value })}
        />
      </PopoverContent>
    </Popover>
  );
}

interface ColorSensitivitySliderProps {
  initialValue: number;
  color?: string | null;
  onCommit: (value: number) => void;
}

function ColorSensitivitySlider({ initialValue, color, onCommit }: ColorSensitivitySliderProps) {
  const t = useTranslations("filter");
  const [value, setValue] = useState(initialValue);
  const debouncedCommit = useDebounceCallback(onCommit, 150);

  return (
    <Slider
      className="pb-2"
      minValue={0}
      maxValue={30}
      value={value}
      onChange={(v) => {
        const newValue = v as number;
        setValue(newValue);
        debouncedCommit(newValue);
      }}
      step={0.1}
      style={{ "--primary": color ?? undefined } as CSSProperties}
    >
      <div className="flex min-w-56 items-center justify-between">
        <Label>{t("color_sensitivity")}</Label>
        <SliderOutput />
      </div>
      <SliderTrack>
        <SliderFill />
        <SliderThumb />
      </SliderTrack>
    </Slider>
  );
}
