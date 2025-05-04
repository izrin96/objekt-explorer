"use client";

import { useObjektSelect } from "@/hooks/use-objekt-select";
import { ValidObjekt } from "@/lib/universal/objekts";
import ObjektView from "./objekt-view";

export function ObjektViewSelectable({
  objekts,
  priority,
  mode,
  select,
  open,
}: {
  objekts: ValidObjekt[];
  priority: boolean;
  mode: boolean;
  select: (id: string | number) => void;
  open: () => void;
}) {
  const [objekt] = objekts;
  const isSelected = useObjektSelect((state) =>
    state.isSelected(objekt.slug as string)
  );

  return (
    <ObjektView
      objekts={objekts}
      priority={priority}
      isSelected={isSelected}
      open={() => {
        if (mode) {
          select(objekt.slug);
        } else {
          open();
        }
      }}
    />
  );
}
