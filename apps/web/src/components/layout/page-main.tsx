import { createContext, use, type ReactNode } from "react";

import { cn, containerClass } from "@/lib/utils";

const InPageMain = createContext(false);

/**
 * The page's content column and its `<main>` landmark.
 *
 * The router's not-found, error and pending fallbacks replace a route's own
 * component, so each needs the column of its own when it mounts outside a
 * layout that has one — and must not add a second `<main>` when it mounts
 * inside one. The context is what tells the two apart.
 */
export function PageMain({ className, children }: { className?: string; children: ReactNode }) {
  const nested = use(InPageMain);
  if (nested) return <>{children}</>;

  return (
    <InPageMain value={true}>
      <main
        data-overflow-guard
        className={cn(containerClass, "flex flex-col gap-4.5 px-5 pt-5 pb-10", className)}
      >
        {children}
      </main>
    </InPageMain>
  );
}
