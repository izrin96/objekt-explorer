import type { ReactNode } from "react";

/**
 * The page head Home, Market, Activity, Lists and Link all draw: the title,
 * a one-line description under it, and a right-hand slot that holds whatever
 * that page puts opposite the title (a freshness line, a primary button).
 *
 * `description` is a node rather than a string because three of the five put
 * `font-mono` counts inside the sentence, and `aside` is rendered as given —
 * a page that has nothing to put there (or has it only in one state) passes
 * nothing and the row is left with one child, which is what `justify-between`
 * already did in each of those five copies.
 *
 * Deliberately not used by `profile/profile-header.tsx`, `list/list-header.tsx`
 * or the auth forms: those are a different shape (avatar, banner, breadcrumb),
 * not this row with different contents.
 */
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
