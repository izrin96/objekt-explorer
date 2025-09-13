"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr";
import { parseColor } from "@react-stately/color";
import { useTranslations } from "next-intl";
import { type CSSProperties, useEffect, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { useFilters } from "@/hooks/use-filters";
import { cn } from "@/utils/classes";
import { Button, ColorPicker } from "../ui";
import ColorSensitivityFilter from "./filter-color-sensitivity";

export default function ColorFilter() {
  const t = useTranslations("filter");
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
      <div style={{ "--objekt-color": color } as CSSProperties}>
        <ColorPicker
          eyeDropper
          className={cn(color && "[&>*]:inset-ring-(--objekt-color)")}
          label={t("color")}
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
            {t("clear_color")}
          </Button>
        </>
      )}
    </>
  );
}
