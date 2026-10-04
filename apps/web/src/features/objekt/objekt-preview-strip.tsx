import { OBJEKT_PREVIEW_SIZE } from "@repo/api/schemas/objekt";
import type { ObjektPreview } from "@repo/api/schemas/objekt";

import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";

/** The card frame; `relative` anchors the stretched link. */
export const previewCardClass =
  "group/card bg-card hover:border-foreground/20 relative flex flex-col overflow-hidden rounded-lg border transition-colors";

/** Stretched over the whole card; controls meant to stay clickable sit above it at `z-10`. */
export const previewCardLinkClass =
  "focus-visible:after:ring-ring outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-inset";

/**
 * A card's latest artworks, with dashed slots standing in for the ones it lacks.
 * `preview` is undefined while loading and null when it could not be read; the
 * card's `group/card` lifts the artworks on hover.
 */
export function ObjektPreviewStrip({ preview }: { preview: ObjektPreview | null | undefined }) {
  return (
    <div
      className="bg-secondary/40 grid gap-1 border-b p-2"
      style={{ gridTemplateColumns: `repeat(${OBJEKT_PREVIEW_SIZE}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {Array.from({ length: OBJEKT_PREVIEW_SIZE }, (_, i) => {
        const objekt = preview?.objekts[i];
        return (
          <div key={i} className="@container">
            {preview === undefined ? (
              <Skeleton className="aspect-photocard rounded-photocard" />
            ) : objekt ? (
              <div className="rounded-photocard bg-secondary aspect-photocard relative overflow-hidden transition-transform duration-200 ease-out motion-safe:group-hover/card:-translate-y-0.5">
                <img
                  src={objekt.thumbnailImage}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="absolute inset-0 size-full object-cover"
                />
              </div>
            ) : (
              <div className="rounded-photocard aspect-photocard border border-dashed" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The card's total beside its other facts; nothing when it could not be read. */
export function ObjektPreviewCount({
  preview,
}: {
  preview: Pick<ObjektPreview, "count"> | null | undefined;
}) {
  if (preview === null) return null;
  if (preview === undefined) return <Skeleton className="h-3 w-16" />;
  return (
    <span className="font-mono tabular-nums">
      {preview.count === 0
        ? m.objekt_count_none()
        : preview.count === 1
          ? m.objekt_count_single()
          : m.objekt_count_multiple({ count: preview.count.toLocaleString() })}
    </span>
  );
}
