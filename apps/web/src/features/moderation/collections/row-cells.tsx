import type { IndexedObjekt } from "@repo/lib/types/objekt";

import { ObjektArtwork } from "@/features/objekt/objekt-artwork";
import { getCollectionShortNo } from "@/features/objekt/objekt-utils";

type Listed = IndexedObjekt;

/** The collection's card in the colours given: its band text, and a corner chip on its background. */
export function MiniCard({
  collection,
  text,
  background,
}: {
  collection: Listed;
  text: string;
  background: string;
}) {
  const objekt = { ...collection, textColor: text, backgroundColor: background };
  return (
    // the container sits outside the card: `cqi` (the radius, the chip) measures an ancestor
    <div className="@container w-12">
      <div className="rounded-photocard aspect-photocard relative overflow-hidden">
        <ObjektArtwork objekt={objekt} />
        <span
          aria-hidden
          className="rounded-br-photocard absolute top-0 left-0 px-[6cqi] py-[3cqi] text-[18cqi] leading-none font-semibold"
          style={{ backgroundColor: background, color: text }}
        >
          {getCollectionShortNo(collection)}
        </span>
      </div>
    </div>
  );
}

export function CollectionCell({ collection }: { collection: Listed }) {
  return (
    <div role="cell" className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate font-mono text-xs">{collection.slug}</span>
      <span className="text-muted-foreground truncate text-xs">
        {[collection.artist, collection.season, collection.class].join(" · ")}
      </span>
    </div>
  );
}
