import { OBJEKT_PREVIEW_SIZE } from "@repo/api/constants";
import type { ObjektPreview } from "@repo/api/schemas/objekts";

import { PendingStatus } from "@/components/router/pending";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

/** The card frame; `relative` anchors the stretched link. */
export const previewCardClass =
  "group/card bg-card hover:border-foreground/20 relative flex flex-col overflow-hidden rounded-lg border transition-colors";

/** Stretched over the whole card; controls meant to stay clickable sit above it at `z-10`. */
export const previewCardLinkClass =
  "focus-visible:after:ring-ring outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-inset";

/** The card's total beside its other facts; nothing when it could not be read. */
export function ObjektPreviewCount({
  preview,
}: {
  preview: Pick<ObjektPreview, "count"> | null | undefined;
}) {
  if (preview === null) return null;
  if (preview === undefined) return <Skeleton className="h-3 w-16" />;
  return (
    <span className="tabular-nums">
      {preview.count === 0
        ? m.objekt_count_none()
        : preview.count === 1
          ? m.objekt_count_single()
          : m.objekt_count_multiple({ count: preview.count.toLocaleString(getLocale()) })}
    </span>
  );
}

/** A linked-profile card while its page loads. */
function PreviewCardSkeleton() {
  return (
    <div className="bg-card flex flex-col overflow-hidden rounded-lg border">
      <div
        className="bg-secondary/40 grid gap-1 border-b p-2"
        style={{ gridTemplateColumns: `repeat(${OBJEKT_PREVIEW_SIZE}, minmax(0, 1fr))` }}
        aria-hidden
      >
        {Array.from({ length: OBJEKT_PREVIEW_SIZE }, (_, i) => (
          <Skeleton key={i} className="aspect-photocard rounded-photocard" />
        ))}
      </div>
      <div className="flex flex-col gap-2 px-3.5 pt-3 pb-3.5">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

/** The linked-profile card grid, as its pending view. */
export function PreviewCardsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <PendingStatus />
      <PreviewCardSkeleton />
      <PreviewCardSkeleton />
      <PreviewCardSkeleton />
    </div>
  );
}
