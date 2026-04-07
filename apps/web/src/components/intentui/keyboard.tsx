"use client";

import { Keyboard as KeyboardPrimitive } from "react-aria-components";
import { twMerge } from "tailwind-merge";

export function Keyboard({ className, ...props }: React.ComponentProps<typeof KeyboardPrimitive>) {
  return (
    <KeyboardPrimitive
      data-slot="keyboard"
      className={twMerge(
        "group-hover:text-fg group-focus:text-fg forced-colors:group-focus:text-[HighlightText hidden font-mono text-[0.80rem] text-current/60 group-focus:opacity-90 group-disabled:opacity-50 lg:inline",
        className,
      )}
      {...props}
    />
  );
}
