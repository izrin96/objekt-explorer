import type { IndexedObjekt } from "@repo/lib/types/objekt";

export function ObjektCollectionThumbnail({
  collection,
}: {
  collection: IndexedObjekt | undefined;
}) {
  if (!collection) {
    return (
      <div className="bg-muted aspect-photocard text-xxs flex w-12 items-center justify-center rounded-sm font-mono">
        N/A
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="border-border aspect-photocard bg-muted relative w-12 overflow-hidden rounded-sm border transition-shadow hover:shadow-md">
        <img
          src={collection.thumbnailImage}
          alt={collection.collectionId}
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
        />
      </div>
      <span
        className="text-xxs w-12 overflow-visible font-mono leading-tight font-medium whitespace-normal"
        title={collection.collectionId}
      >
        {collection.collectionId}
      </span>
    </div>
  );
}
