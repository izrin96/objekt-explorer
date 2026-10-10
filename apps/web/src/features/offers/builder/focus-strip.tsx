import type { CandidateItem } from "@repo/api/schemas/offer";

import { Skeleton } from "@/components/ui/skeleton";
import { PhotocardSkeleton } from "@/features/objekt/photocard-skeleton";
import { CandidateTile } from "@/features/offers/candidate-tile";
import { type Collections, pickKey } from "@/features/offers/pick";

export function FocusStrip({
  label,
  items,
  collections,
  full,
  isSelected,
  onToggle,
}: {
  label: string;
  items: CandidateItem[];
  collections: Collections;
  full: boolean;
  isSelected: (item: CandidateItem) => boolean;
  onToggle: (item: CandidateItem) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <li key={pickKey(item)} className="min-w-0">
            <CandidateTile
              item={item}
              collection={collections[item.collectionSlug]}
              selected={isSelected(item)}
              full={full}
              onToggle={() => onToggle(item)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The strip's shape while it loads, so the dialog does not grow under the reader. */
export function FocusStripSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-1">
            <PhotocardSkeleton />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
