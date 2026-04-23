"use client";

import { composeRenderProps } from "react-aria-components/composeRenderProps";
import { ToggleButton, type ToggleButtonProps } from "react-aria-components/ToggleButton";
import { twMerge } from "tailwind-merge";
import { tv, type VariantProps } from "tailwind-variants";

export const toggleStyles = tv({
  base: [
    "[--toggle-icon-active:var(--secondary-fg)] [--toggle-icon:color-mix(in_oklab,var(--secondary-fg)_50%,var(--secondary))]",
    "relative isolate inline-flex items-center justify-center border font-medium",
    "focus-visible:ring-offset-bg focus-visible:ring-2 focus-visible:ring-offset-3 focus-visible:outline focus-visible:outline-offset-2",
    "*:data-[slot=icon]:-mx-0.5 *:data-[slot=icon]:my-1 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:self-center *:data-[slot=icon]:text-(--toggle-icon)",
    "focus-visible:*:data-[slot=icon]:text-(--toggle-icon-active)",
    "selected:*:data-[slot=icon]:text-(--toggle-icon-active)",
    "hover:*:data-[slot=icon]:text-(--toggle-icon-active)",
    "pressed:*:data-[slot=icon]:text-(--toggle-icon-active) *:data-[slot=icon]:-mx-0.5 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:self-center *:data-[slot=icon]:text-(--toggle-icon) hover:*:data-[slot=icon]:text-(--toggle-icon-active)/90 focus-visible:*:data-[slot=icon]:text-(--toggle-icon-active)/80 forced-colors:[--toggle-icon:ButtonText] forced-colors:hover:[--toggle-icon:ButtonText]",
    "forced-colors:[--toggle-icon:ButtonText] forced-colors:hover:[--toggle-icon:ButtonText]",
    // custom
    "selected:[&:not([data-no-border])]:border-accent-solid selected:[&:not([data-no-border])]:shadow-accent-solid/20 selected:[&:not([data-no-border])]:shadow-sm",
  ],
  variants: {
    intent: {
      outline: ["outline-secondary-fg ring-secondary-fg/25 hover:bg-secondary bg-transparent"],
      plain: [
        "outline-secondary-fg ring-secondary-fg/25 hover:bg-secondary border-transparent bg-transparent",
      ],
    },
    size: {
      xs: [
        "min-h-7 gap-x-1.5 px-2 py-[calc(--spacing(1.5)-1px)] text-xs/4",
        "*:data-[slot=icon]:-mx-px *:data-[slot=icon]:size-3",
      ],
      sm: [
        "min-h-8 gap-x-1.5 px-[calc(--spacing(3)-1px)] py-[calc(--spacing(1.5)-1px)] text-sm/5",
        "*:data-[slot=icon]:size-4",
      ],
      md: [
        "min-h-9 gap-x-2 px-3 py-[calc(--spacing(1.5)-1px)] text-sm/6",
        "*:data-[slot=icon]:size-4",
      ],
      lg: [
        "min-h-9 gap-x-2 px-3 py-[calc(--spacing(1.5)-1px)] text-sm/7",
        "*:data-[slot=icon]:size-4.5",
      ],
      "sq-xs": ["touch-target size-7 shrink-0", "*:data-[slot=icon]:size-3"],
      "sq-sm": ["touch-target size-8 shrink-0", "*:data-[slot=icon]:size-4"],
      "sq-md": ["touch-target size-9 shrink-0", "*:data-[slot=icon]:size-4.5"],
      "sq-lg": ["touch-target size-10 shrink-0", "*:data-[slot=icon]:size-5"],
    },
    isCircle: {
      true: "rounded-full",
      false: "rounded-[calc(var(--radius-lg)-1px)]",
    },
    isDisabled: {
      true: "border-0 opacity-50 forced-colors:text-[GrayText]",
    },
  },
  defaultVariants: {
    intent: "plain",
    size: "md",
    isCircle: false,
  },
});

export interface ToggleProps extends ToggleButtonProps, VariantProps<typeof toggleStyles> {
  ref?: React.Ref<HTMLButtonElement>;
}
export function Toggle({ className, size, intent, isCircle, ref, ...props }: ToggleProps) {
  return (
    <ToggleButton
      ref={ref}
      className={composeRenderProps(className, (className, renderProps) =>
        twMerge(
          toggleStyles({
            ...renderProps,
            isCircle,
            size,
            intent,
            className,
          }),
        ),
      )}
      {...props}
    />
  );
}
