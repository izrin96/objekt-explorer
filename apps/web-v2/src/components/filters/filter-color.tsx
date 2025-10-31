import { XIcon } from "@phosphor-icons/react/dist/ssr";
import { type Color, parseColor } from "@react-stately/color";
import { type CSSProperties, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { useFilters } from "@/hooks/use-filters";
import { Button } from "../ui/button";
import { ColorArea } from "../ui/color-area";
import { ColorField } from "../ui/color-field";
import { ColorPicker, EyeDropper } from "../ui/color-picker";
import { ColorSlider, ColorSliderTrack } from "../ui/color-slider";
import { ColorSwatch } from "../ui/color-swatch";
import { ColorThumb } from "../ui/color-thumb";
import { Input } from "../ui/input";
import { Popover, PopoverBody, PopoverContent } from "../ui/popover";
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
            onClick={() =>
              setFilters({
                color: null,
                colorSensitivity: null,
              })
            }
          >
            <XIcon data-slot="icon" />
            Clear color
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
  const [localColor, setLocalColor] = useState(initialValue);
  const [color, setColor] = useState(initialValue);
  const debouncedCommit = useDebounceCallback(onCommit, 60);

  if (initialValue !== localColor) {
    setLocalColor(initialValue);
    setColor(initialValue);
  }

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
            className="selected:border-(--objekt-color)"
            intent="outline"
            data-slot="control"
          >
            <ColorSwatch className="[--color-swatch-size:--spacing(5)]" />
            Color
          </Button>
          <PopoverContent className="[--gutter:--spacing(1)]">
            <PopoverBody>
              <div className="space-y-(--gutter) p-2">
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
                  <ColorField aria-label="Color">
                    <Input />
                  </ColorField>
                </div>
              </div>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </ColorPicker>
    </div>
  );
}
