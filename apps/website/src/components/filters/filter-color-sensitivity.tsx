import { type CSSProperties, useState } from "react";
import { useIntlayer } from "react-intlayer";
import { useDebounceCallback } from "usehooks-ts";

import { useFilters } from "@/hooks/use-filters";

import { Button } from "../intentui/button";
import { Label } from "../intentui/field";
import { Popover, PopoverBody, PopoverContent } from "../intentui/popover";
import { Slider, SliderFill, SliderOutput, SliderThumb, SliderTrack } from "../intentui/slider";

export default function ColorSensitivityFilter() {
  const content = useIntlayer("filter");
  const [filters, setFilters] = useFilters();

  return (
    <Popover>
      <Button intent="outline">{content.color_sensitivity.value}</Button>
      <PopoverContent>
        <PopoverBody className="py-2 [--gutter:--spacing(4)]">
          <ColorSensitivitySlider
            initialValue={filters.colorSensitivity ?? 7}
            color={filters.color}
            onCommit={(value) => setFilters({ colorSensitivity: value === 7 ? null : value })}
          />
        </PopoverBody>
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
  const content = useIntlayer("filter");
  const [value, setValue] = useState(initialValue);
  const debouncedCommit = useDebounceCallback(onCommit, 100);

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
        <Label>{content.color_sensitivity.value}</Label>
        <SliderOutput />
      </div>
      <SliderTrack>
        <SliderFill />
        <SliderThumb />
      </SliderTrack>
    </Slider>
  );
}
