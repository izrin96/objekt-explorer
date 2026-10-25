import { useHydrated } from "@tanstack/react-router";

import { formatTimestamp } from "@/lib/time";

/** An instant in the viewer's zone, printed once hydrated: the server renders in UTC. */
export function When({ iso, className }: { iso: string; className?: string }) {
  const hydrated = useHydrated();
  return (
    <time dateTime={iso} className={className}>
      {hydrated ? formatTimestamp(new Date(iso)) : null}
    </time>
  );
}
