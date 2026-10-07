/**
 * The unread dot pinned to a header icon's corner; the button's label carries the count. It is
 * ringed in the page colour so the icon stops cleanly at its edge.
 */
export function UnreadDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden
      className="bg-accent-solid ring-background absolute top-1 right-1 size-2 rounded-full ring-2"
    />
  );
}
