/** The unread count pinned to a header icon button; the button itself carries the label. */
export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden
      className="bg-accent-solid ring-background absolute top-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[9px] leading-none font-semibold text-white tabular-nums ring-1"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
