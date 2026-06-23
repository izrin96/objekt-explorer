import { XIcon } from "@phosphor-icons/react/dist/ssr";
import { type Color, parseColor } from "@react-stately/color";
import { type CSSProperties, useEffect, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";

import { useFilters } from "@/hooks/use-filters";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { ColorArea } from "../intentui/color-area";
import { ColorField } from "../intentui/color-field";
import { ColorPicker, EyeDropper } from "../intentui/color-picker";
import { ColorSlider, ColorSliderTrack } from "../intentui/color-slider";
import { ColorSwatch } from "../intentui/color-swatch";
import { ColorThumb } from "../intentui/color-thumb";
import { Input } from "../intentui/input";
import { Popover, PopoverBody, PopoverContent } from "../intentui/popover";
import ColorSensitivityFilter from "./filter-color-sensitivity";

export default function ColorFilter() {
  const [filters, setFilters] = useFilters();

  return (
    <>
      <ColorPickerControl
        initialValue={filters.color}
        onCommit={(value) => setFilters({ color: value })}
      />
      {filters.color && (
        <>
          <ColorSensitivityFilter />
          <Button
            intent="outline"
            onPress={() =>
              setFilters({
                color: null,
                colorSensitivity: null,
              })
            }
          >
            <XIcon />
            {m.filter_clear_color()}
          </Button>
        </>
      )}
    </>
  );
}

interface ColorPickerControlProps {
  initialValue: string | null;
  onCommit: (value: string | null) => void;
}

function ColorPickerControl({ initialValue, onCommit }: ColorPickerControlProps) {
  const [color, setColor] = useState(initialValue);
  const debouncedCommit = useDebounceCallback(onCommit, 60);

  useEffect(() => {
    setColor(initialValue);
  }, [initialValue]);

  const handleChange = (c: Color) => {
    const hsl = c.toString("hsl");
    setColor(hsl);
    debouncedCommit(hsl);
  };

  return (
    <div style={{ "--objekt-color": color } as CSSProperties}>
      <ColorPicker value={color ? parseColor(color) : "#000"} onChange={handleChange}>
        <Popover>
          <Button
            data-selected={color}
            className="[--accent-solid:var(--objekt-color)]"
            intent="outline"
            data-slot="control"
          >
            <ColorSwatch className="[--color-swatch-size:--spacing(5)]" />
            {m.filter_color()}
          </Button>
          <PopoverContent>
            <PopoverBody className="space-y-2 py-3 [--gutter:--spacing(3)]">
              <ColorArea
                colorSpace="hsb"
                defaultValue="rgb(120,140,200)"
                xChannel="saturation"
                yChannel="brightness"
              />
              <ColorSlider colorSpace="hsb" channel="hue">
                <ColorSliderTrack>
                  <ColorThumb />
                </ColorSliderTrack>
              </ColorSlider>
              <div className="flex items-center gap-1.5">
                <EyeDropper />
                <ColorField aria-label={m.filter_color()} className="w-0 flex-1">
                  <Input />
                </ColorField>
              </div>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </ColorPicker>
    </div>
  );
}
