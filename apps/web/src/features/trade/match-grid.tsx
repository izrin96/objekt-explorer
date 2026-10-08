import { PREVIEW_LIMIT } from "@repo/api/schemas/trade";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { ReactNode } from "react";

import { ObjektCard } from "@/features/objekt/objekt-card";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { SlugTile, THUMB_GRID, TILE } from "./thumb-grid";

export function MatchGrid({ count, children }: { count: number; children: ReactNode }) {
  const more = count - PREVIEW_LIMIT;
  return (
    <div className={THUMB_GRID}>
      {children}
      {more > 0 ? (
        <div className="@container self-start">
          <div className={cn(TILE, "text-sm tabular-nums")}>
            <span aria-hidden>+{more}</span>
            <span className="sr-only">{m.trade_more_count({ count: more })}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MatchObjekt({
  slug,
  collection,
  caption,
  muted = false,
  onOpen,
}: {
  slug: string;
  collection: ValidObjekt | undefined;
  caption?: string;
  muted?: boolean;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  return (
    // a container, so the slug tile's radius matches the cards'
    <figure className="@container flex min-w-0 flex-col gap-1 self-start">
      <div className={cn(muted && "opacity-50 grayscale")}>
        {collection ? (
          <ObjektCard
            objekt={collection}
            image="thumbnail"
            captionClassName="text-xs"
            onOpen={() => onOpen(collection)}
          />
        ) : (
          <SlugTile>{slug}</SlugTile>
        )}
      </div>
      {caption ? (
        <figcaption className="text-muted-foreground text-xs break-words">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
