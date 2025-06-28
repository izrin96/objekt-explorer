"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr";
import { parseColor } from "@react-stately/color";
import { type CSSProperties, useEffect, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { useFilters } from "@/hooks/use-filters";
import { cn } from "@/utils/classes";
import { Button, ColorPicker } from "../ui";
import ColorSensitivityFilter from "./filter-color-sensitivity";

export default function ColorFilter() {
  const [filters, setFilters] = useFilters();
  const [color, setColor] = useState(filters.color);
  const [debouncedColor] = useDebounceValue(color, 60);

  useEffect(() => {
    setFilters({ color: debouncedColor });
  }, [debouncedColor, setFilters]);

  useEffect(() => {
    if (!filters.color) {
      setColor(null);
    }
  }, [filters.color]);

  return (
    <>
      <div style={{ "--ring-color": color } as CSSProperties}>
        <ColorPicker
          eyeDropper
          className={cn(
            "inset-ring inset-ring-fg/15 rounded",
            color && "inset-ring-(--ring-color)",
          )}
          label="Color"
          value={color ? parseColor(color) : "#000"}
          onChange={(color) => setColor(color.toString("hsl"))}
        />
      </div>
      {color && (
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
