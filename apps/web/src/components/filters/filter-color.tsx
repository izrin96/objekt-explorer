"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr";
import { type Color, parseColor } from "@react-stately/color";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("filter");
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
            <XIcon data-slot="icon" />
            {t("clear_color")}
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
  const t = useTranslations("filter");
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
            {t("color")}
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
                <ColorField aria-label="Color" className="w-0 flex-1">
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
