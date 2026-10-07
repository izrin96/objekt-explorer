/**
 * The unread count pinned to a header icon button, or a plain dot where the number matters
 * less; the button itself carries the label. It sits on the icon's corner, ringed in the page
 * colour so the icon stops cleanly at its edge.
 */
export function CountBadge({ count, dot = false }: { count: number; dot?: boolean }) {
  if (count <= 0) return null;
  if (dot) {
    return (
      <span
        aria-hidden
        className="bg-accent-solid ring-background absolute top-1 right-1 size-2 rounded-full ring-2"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="bg-accent-solid ring-background absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold text-white tabular-nums ring-2"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
