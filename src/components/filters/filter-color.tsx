"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr";
import { type Color, parseColor } from "@react-stately/color";
import { useTranslations } from "next-intl";
import { type CSSProperties, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { useFilters } from "@/hooks/use-filters";
import { cn } from "@/utils/classes";
import { Button, ColorPicker } from "../ui";
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
            onClick={() =>
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
      <ColorPicker
        eyeDropper
        className={cn(color && "[&>*]:inset-ring-(--objekt-color)")}
        label={t("color")}
        value={color ? parseColor(color) : "#000"}
        onChange={handleChange}
      />
    </div>
  );
}
