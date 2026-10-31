import { CopyIcon, EyedropperIcon } from "@phosphor-icons/react";
import { useId, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  ColorPicker,
  ColorPickerArea,
  ColorPickerHue,
  ColorPickerInput,
  ColorPickerSwatch,
  ColorPickerSwatches,
  hexToHsv,
  hsvToHex,
  useColorPicker,
} from "@/components/ui/color-picker";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { toastManager } from "@/components/ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { m } from "@/paraglide/messages";

type EyeDropperConstructor = new () => { open: () => Promise<{ sRGBHex: string }> };

function getEyeDropper(): EyeDropperConstructor | null {
  if (typeof window === "undefined") return null;
  return (window as { EyeDropper?: EyeDropperConstructor }).EyeDropper ?? null;
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon-xs" aria-label={label} onClick={onClick} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}

function HexField({ onValueChange }: { onValueChange: (hex: string) => void }) {
  const { hex, setHex } = useColorPicker();
  const eyeDropper = getEyeDropper();

  // the picker drops a colour equal to the one it shows, so with no filter set, typing or
  // eyedropping that colour would apply nothing; send it on directly instead
  const pick = (candidate: string) => {
    const next = canonicalHex(candidate);
    if (!next) return;
    if (next === hex) onValueChange(next);
    else setHex(next);
  };

  const copyHex = async () => {
    try {
      await navigator.clipboard.writeText(hex);
      toastManager.add({ type: "success", title: m.common_copy_copied() });
    } catch {
      toastManager.add({ type: "error", title: m.common_copy_blocked(), description: hex });
    }
  };

  const pickFromScreen = async () => {
    if (!eyeDropper) return;
    try {
      const result = await new eyeDropper().open();
      pick(result.sRGBHex);
    } catch {
      // dismissed: keep the current colour
    }
  };

  return (
    <InputGroup>
      <ColorPickerInput
        unstyled
        size="sm"
        name="hex"
        aria-label={m.filter_color_hex()}
        onKeyDown={(event) => {
          if (event.key === "Enter") pick(event.currentTarget.value);
        }}
      />
      <InputGroupAddon align="inline-end">
        <IconAction label={m.common_copy_button()} onClick={() => void copyHex()}>
          <CopyIcon />
        </IconAction>
        {eyeDropper && (
          <IconAction label={m.filter_color_eyedropper()} onClick={() => void pickFromScreen()}>
            <EyedropperIcon />
          </IconAction>
        )}
      </InputGroupAddon>
    </InputGroup>
  );
}

/**
 * Lowercase `#rrggbb`, or null if `hex` does not parse. The picker re-seeds whenever its
 * `value` differs from its own `#rrggbb`, so a `#fff` or `ff0000` from a hand-edited URL
 * would re-render it forever.
 */
export function canonicalHex(hex: string | undefined): string | null {
  const parsed = hex ? hexToHsv(hex) : null;
  return parsed ? hsvToHex(parsed) : null;
}

export function FilterColorPicker({
  value,
  onValueChange,
  swatches,
}: {
  /** lowercase `#rrggbb`; see `canonicalHex` */
  value: string;
  onValueChange: (hex: string) => void;
  swatches?: readonly string[];
}) {
  const hueLabelId = useId();

  return (
    <ColorPicker value={value} onValueChange={onValueChange}>
      <ColorPickerArea className="h-36 cursor-crosshair" />
      {/* Base UI names the hue's range input from the root's `aria-labelledby`, never its `aria-label` */}
      <span id={hueLabelId} className="sr-only">
        {m.filter_color_hue()}
      </span>
      <ColorPickerHue
        aria-label={m.filter_color_hue()}
        aria-labelledby={hueLabelId}
        name="hue"
        largeStep={30}
      />
      <HexField onValueChange={onValueChange} />
      {swatches && swatches.length > 0 && (
        <ColorPickerSwatches className="grid grid-cols-8">
          {swatches.map((swatch) => (
            <ColorPickerSwatch
              key={swatch}
              value={swatch}
              aria-label={m.filter_color_use({ color: swatch })}
              className="focus-visible:ring-offset-popover aria-pressed:ring-offset-popover aspect-square size-auto w-full"
            />
          ))}
        </ColorPickerSwatches>
      )}
    </ColorPicker>
  );
}
