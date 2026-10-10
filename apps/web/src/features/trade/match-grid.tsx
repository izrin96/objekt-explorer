import { PREVIEW_LIMIT } from "@repo/api/schemas/trade";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { ReactNode } from "react";

import { ObjektCard } from "@/features/objekt/objekt-card";
import { collectionName } from "@/features/objekt/objekt-label";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { SlugTile, TILE } from "./thumb-grid";

/** The counted objekts, a "+N" tile for the rest, then the ones `dropped` leaves out. */
export function MatchColumn({
  count,
  dropped,
  children,
}: {
  count: number;
  dropped?: ReactNode;
  children: ReactNode;
}) {
  const more = count - PREVIEW_LIMIT;
  return (
    <div className="flex flex-wrap items-start gap-x-2 gap-y-2">
      {children}
      {more > 0 ? (
        <div className="@container w-12">
          <div className={cn(TILE, "text-sm tabular-nums")}>
            <span aria-hidden>+{more}</span>
            <span className="sr-only">{m.trade_more_count({ count: more })}</span>
          </div>
        </div>
      ) : null}
      {dropped}
    </div>
  );
}

/** With `reason`, the objekt isn't counted: struck through, with the reason under its name. */
export function MatchObjekt({
  slug,
  collection,
  reason,
  onOpen,
}: {
  slug: string;
  collection: ValidObjekt | undefined;
  reason?: string;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  return (
    <figure className="text-xxs flex w-12 min-w-0 flex-col gap-1 font-mono">
      {/* a container, so the slug tile's radius matches the cards' */}
      <div className="@container relative w-12">
        <div className={cn(reason && "opacity-60 grayscale")}>
          {collection ? (
            <ObjektCard
              objekt={collection}
              image="thumbnail"
              hideLabel
              onOpen={() => onOpen(collection)}
            />
          ) : (
            <SlugTile className="text-xxs p-1">{slug}</SlugTile>
          )}
        </div>
        {reason ? (
          <span
            aria-hidden
            className="bg-destructive pointer-events-none absolute inset-x-0 top-1/2 h-px origin-center scale-x-125 -rotate-[56deg]"
          />
        ) : null}
      </div>
      <figcaption className="flex min-w-0 flex-col gap-0.5 leading-tight">
        <span className="line-clamp-2 break-words">{collectionName(slug, collection)}</span>
        {reason ? <span className="text-destructive-foreground break-words">{reason}</span> : null}
      </figcaption>
    </figure>
  );
}
