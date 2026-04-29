import {
  ColorSwatch as ColorSwatchPrimitive,
  type ColorSwatchProps,
} from "react-aria-components/ColorSwatch";

import { cx } from "@/lib/primitive";

export function ColorSwatch({ className, ...props }: ColorSwatchProps) {
  return (
    <ColorSwatchPrimitive
      data-slot="color-swatch"
      className={cx(
        "inset-ring-1 inset-ring-current/20 shrink-0 rounded-[calc(var(--radius-md)-1px)] [--color-swatch-size:--spacing(9)] size-(--color-swatch-size)",
        className,
      )}
      {...props}
    />
  );
}
