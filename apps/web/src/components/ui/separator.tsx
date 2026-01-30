"use client";

import { Separator as Divider, type SeparatorProps } from "react-aria-components";
import { twMerge } from "tailwind-merge";

export function Separator({ orientation = "horizontal", className, ...props }: SeparatorProps) {
  return (
    <Divider
      className={twMerge(
        "bg-border shrink-0 border-0 forced-colors:bg-[ButtonBorder]",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}
