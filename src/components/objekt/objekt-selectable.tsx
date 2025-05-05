"use client";

import { useObjektSelect } from "@/hooks/use-objekt-select";
import { ValidObjekt } from "@/lib/universal/objekts";
import ObjektView from "./objekt-view";

export function ObjektViewSelectable({
  objekts,
  priority,
  getId,
  open,
}: {
  objekts: ValidObjekt[];
  priority: boolean;
  getId: () => string | number;
  open: () => void;
}) {
  const mode = useObjektSelect((a) => a.mode);
  const select = useObjektSelect((a) => a.select);
  const isSelected = useObjektSelect((state) => state.isSelected(getId()));
  return (
    <ObjektView
      objekts={objekts}
      priority={priority}
      isSelected={isSelected}
      open={() => {
        if (mode) {
          select(getId());
        } else {
          open();
        }
      }}
      select={() => select(getId())}
    />
  );
}
