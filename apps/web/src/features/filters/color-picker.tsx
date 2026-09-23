/* oxlint-disable jsx-a11y/prefer-tag-over-role -- the 2D saturation/brightness plane and the hue rail have no native input equivalent; both implement the slider keyboard contract */

import { CopyIcon, EyedropperIcon } from "@phosphor-icons/react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { toastManager } from "@/components/ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/* HSV internally, hex at the edges. Hue is kept in state rather than
 * re-derived, so the rail does not snap to 0 when saturation or brightness
 * reach an extreme. Adapted from Neon UI's `color-picker`. */
type Hsv = { h: number; s: number; v: number };

const HEX_RE = /^#?(?<hex>[0-9a-f]{6})$/iu;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function hexToHsv(hex: string): Hsv | null {
  const match = HEX_RE.exec(hex.trim());
  if (!match?.groups?.hex) return null;

  const int = Number.parseInt(match.groups.hex, 16);
  const r = Math.floor(int / 65_536) / 255;
  const g = Math.floor((int % 65_536) / 256) / 255;
  const b = (int % 256) / 255;
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  let h = 0;
  if (delta > 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }

  return { h: (h + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}

function hsvToHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    const channel = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(channel * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

type EyeDropperConstructor = new () => { open: () => Promise<{ sRGBHex: string }> };

function getEyeDropper(): EyeDropperConstructor | null {
  if (typeof window === "undefined") return null;
  return (window as { EyeDropper?: EyeDropperConstructor }).EyeDropper ?? null;
}

/** a pointer event as 0–1 coordinates within its target */
function fraction(event: PointerEvent<HTMLDivElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: clamp01((event.clientX - rect.left) / rect.width),
    y: clamp01((event.clientY - rect.top) / rect.height),
  };
}

const ARROW_DELTA: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

function Thumb({ dragging, style }: { dragging: boolean; style: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.5)] transition-transform duration-150 motion-reduce:transition-none",
        dragging && "scale-125",
      )}
      style={style}
    />
  );
}

export function ColorPicker({
  value,
  defaultValue,
  onValueChange,
  swatches,
  label,
  className,
}: {
  value?: string;
  /** the colour the plane opens on while there is no `value` */
  defaultValue?: string;
  onValueChange: (hex: string) => void;
  swatches?: readonly string[];
  /** accessible name of the trigger */
  label: string;
  className?: string;
}) {
  const [hsv, setHsv] = useState<Hsv>(
    () => hexToHsv(value ?? defaultValue ?? "") ?? { h: 0, s: 1, v: 1 },
  );
  // the hex field's text, only while it is being edited
  const [draft, setDraft] = useState<string | null>(null);
  const [dragging, setDragging] = useState<"field" | "hue" | null>(null);
  // a controlled value re-seeds the plane during render, not in an effect
  const [seenValue, setSeenValue] = useState(value);
  if (value !== seenValue) {
    setSeenValue(value);
    const parsed = value ? hexToHsv(value) : null;
    if (parsed) setHsv(parsed);
  }

  const hex = (value ?? hsvToHex(hsv)).toLowerCase();
  const hueOnly = hsvToHex({ h: hsv.h, s: 1, v: 1 });
  const eyeDropper = getEyeDropper();

  const commit = (next: Hsv) => {
    setHsv(next);
    setDraft(null);
    onValueChange(hsvToHex(next));
  };

  const commitHex = (candidate: string) => {
    const parsed = hexToHsv(candidate);
    if (parsed) commit(parsed);
    else setDraft(null);
  };

  const pickFromScreen = async () => {
    if (!eyeDropper) return;
    try {
      const result = await new eyeDropper().open();
      commitHex(result.sRGBHex);
    } catch {
      // dismissed: keep the current colour
    }
  };

  const copyHex = async () => {
    try {
      await navigator.clipboard.writeText(hex);
      toastManager.add({ type: "success", title: m.common_copy_copied() });
    } catch {
      toastManager.add({ type: "error", title: "Clipboard blocked", description: hex });
    }
  };

  const onFieldPointer = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging("field");
    const { x, y } = fraction(event);
    commit({ ...hsv, s: x, v: 1 - y });
  };

  const onFieldKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = ARROW_DELTA[event.key];
    if (!delta) return;
    event.preventDefault();
    const step = event.shiftKey ? 0.1 : 0.02;
    commit({
      ...hsv,
      s: clamp01(hsv.s + delta[0] * step),
      v: clamp01(hsv.v - delta[1] * step),
    });
  };

  const onHuePointer = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging("hue");
    commit({ ...hsv, h: fraction(event).x * 360 });
  };

  const onHueKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = ARROW_DELTA[event.key];
    if (!delta) return;
    event.preventDefault();
    const step = event.shiftKey ? 30 : 4;
    commit({ ...hsv, h: (hsv.h + delta[0] * step + 360) % 360 });
  };

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`${label}: ${hex}`}
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn("justify-start font-mono", className)}
          />
        }
      >
        <span
          aria-hidden="true"
          className="ring-foreground/15 size-4 shrink-0 rounded-full ring-1"
          style={{ backgroundColor: hex }}
        />
        {hex}
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-64">
        <div className="flex flex-col gap-3">
          <div
            role="slider"
            aria-label={m.filter_color_plane()}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(hsv.v * 100)}
            aria-valuetext={hex}
            tabIndex={0}
            className="focus-visible:ring-ring relative h-36 cursor-crosshair touch-none rounded-md outline-none focus-visible:ring-2"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${hueOnly}`,
            }}
            onKeyDown={onFieldKey}
            onPointerDown={onFieldPointer}
            onPointerMove={(event) => {
              if (event.buttons > 0) onFieldPointer(event);
            }}
            onPointerUp={() => setDragging(null)}
          >
            <Thumb
              dragging={dragging === "field"}
              style={{
                backgroundColor: hex,
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
              }}
            />
          </div>

          <div
            role="slider"
            aria-label={m.filter_color_hue()}
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={Math.round(hsv.h)}
            tabIndex={0}
            className="focus-visible:ring-ring relative h-3 cursor-ew-resize touch-none rounded-full outline-none focus-visible:ring-2"
            style={{
              background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
            }}
            onKeyDown={onHueKey}
            onPointerDown={onHuePointer}
            onPointerMove={(event) => {
              if (event.buttons > 0) onHuePointer(event);
            }}
            onPointerUp={() => setDragging(null)}
          >
            <Thumb
              dragging={dragging === "hue"}
              style={{ backgroundColor: hueOnly, left: `${(hsv.h / 360) * 100}%`, top: "50%" }}
            />
          </div>

          <InputGroup>
            <InputGroupAddon>
              <InputGroupText className="font-mono">#</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              size="sm"
              name="hex"
              aria-label={m.filter_color_hex()}
              spellCheck={false}
              className="font-mono"
              value={(draft ?? hex).replace("#", "")}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => commitHex(draft ?? hex)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitHex(draft ?? hex);
              }}
            />
            <InputGroupAddon align="inline-end">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={m.common_copy_button()}
                      onClick={() => void copyHex()}
                    />
                  }
                >
                  <CopyIcon />
                </TooltipTrigger>
                <TooltipPopup>{m.common_copy_button()}</TooltipPopup>
              </Tooltip>
              {eyeDropper && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={m.filter_color_eyedropper()}
                        onClick={() => void pickFromScreen()}
                      />
                    }
                  >
                    <EyedropperIcon />
                  </TooltipTrigger>
                  <TooltipPopup>{m.filter_color_eyedropper()}</TooltipPopup>
                </Tooltip>
              )}
            </InputGroupAddon>
          </InputGroup>

          {swatches && swatches.length > 0 && (
            <div className="grid grid-cols-8 gap-1.5">
              {swatches.map((swatch) => {
                const active = swatch.toLowerCase() === hex;
                return (
                  <button
                    key={swatch}
                    type="button"
                    aria-label={m.filter_color_use({ color: swatch })}
                    aria-pressed={active}
                    className={cn(
                      "ring-foreground/15 focus-visible:ring-ring aspect-square w-full cursor-pointer rounded-full ring-1 transition-shadow outline-none focus-visible:ring-2",
                      active && "ring-foreground ring-offset-popover ring-2 ring-offset-2",
                    )}
                    style={{ backgroundColor: swatch }}
                    onClick={() => commitHex(swatch)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </PopoverPopup>
    </Popover>
  );
}
