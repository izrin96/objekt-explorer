import type { ComponentProps } from "react";

/** WAVBase's mark, a rounded square, in `currentColor` like the Apollo icon beside it */
export function WavbaseIcon({ className }: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="4.5" fill="currentColor" />
    </svg>
  );
}
