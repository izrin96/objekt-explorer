import type { ValidObjekt } from "@repo/lib/types/objekt";

import { ObjektCard } from "@/features/objekt/objekt-card";
import { cn } from "@/lib/utils";

/** The card art at thumbnail size; the slug stands in while a collection is unknown. */
export function OfferThumb({
  slug,
  collection,
  onOpen,
  className,
}: {
  slug: string;
  collection: ValidObjekt | undefined;
  onOpen?: (objekt: ValidObjekt) => void;
  className?: string;
}) {
  return (
    <div className={cn("@container shrink-0", className)}>
      {collection ? (
        <ObjektCard objekt={collection} image="thumbnail" hideLabel hideSerial onOpen={onOpen} />
      ) : (
        <div className="bg-muted text-muted-foreground rounded-photocard aspect-photocard grid place-items-center p-0.5 text-center font-mono text-[8cqi] leading-tight break-all">
          {slug}
        </div>
      )}
    </div>
  );
}
