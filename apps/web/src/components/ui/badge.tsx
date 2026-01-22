import { tv, type VariantProps } from "tailwind-variants";

const badgeStyles = tv({
  base: [
    "inline-flex items-center gap-x-1.5 py-0.5 text-xs/5 font-medium forced-colors:outline",
    "bg-(--badge-bg) text-(--badge-fg) inset-ring inset-ring-(--badge-ring) [--badge-ring:transparent]",
    "group-hover:bg-(--badge-overlay) group-focus:bg-(--badge-overlay)",
    "*:data-[slot=icon]:size-3 *:data-[slot=icon]:shrink-0",
    "duration-200",
  ],
  variants: {
    intent: {
      primary:
        "[--badge-bg:var(--primary-subtle)] [--badge-fg:var(--primary-subtle-fg)] [--badge-overlay:var(--primary)]/20",
      secondary:
        "[--badge-bg:var(--secondary)] [--badge-fg:var(--secondary-fg)] [--badge-overlay:var(--muted-fg)]/25",
      success:
        "[--badge-bg:var(--success-subtle)] [--badge-fg:var(--success-subtle-fg)] [--badge-overlay:var(--success)]/20",
      info: "[--badge-bg:var(--info-subtle)] [--badge-fg:var(--info-subtle-fg)] [--badge-overlay:var(--sky-500)]/20",
      warning:
        "[--badge-bg:var(--warning-subtle)] [--badge-fg:var(--warning-subtle-fg)] [--badge-overlay:var(--warning)]/20",
      danger:
        "[--badge-bg:var(--danger-subtle)] [--badge-fg:var(--danger-subtle-fg)] [--badge-overlay:var(--danger)]/20",
      outline: "[--badge-overlay:var(--secondary)]/20 [--badge-ring:var(--border)]",
      custom:
        "[--badge-bg:var(--color-pink-500)]/15 [--badge-fg:var(--color-pink-700)] [--badge-overlay:var(--color-pink-500)]/20 dark:[--badge-fg:var(--color-pink-300)]",
    },
    isCircle: {
      true: "rounded-lg px-2",
      false: "rounded-sm px-1.5",
    },
  },
  defaultVariants: {
    intent: "primary",
    isCircle: true,
  },
});

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeStyles> {
  className?: string;
  children: React.ReactNode;
}

const Badge = ({ children, intent, isCircle = true, className, ...props }: BadgeProps) => {
  return (
    <span {...props} className={badgeStyles({ intent, isCircle, className })}>
      {children}
    </span>
  );
};

export type { BadgeProps };
export { Badge, badgeStyles };
