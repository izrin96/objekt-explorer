import type { ReactNode } from "react";

/** `description` is a node: pages put `font-mono` counts inside the sentence. */
export function PageHeader({
  title,
  description,
  aside,
}: {
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-balance">
          {title}
        </h1>
        {description !== undefined && (
          <div className="text-muted-foreground mt-0.5 text-[13px]">{description}</div>
        )}
      </div>
      {aside}
    </div>
  );
}
