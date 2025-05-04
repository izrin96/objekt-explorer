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
  const isSelected = useObjektSelect((state) => state.isSelected(getId()));
  return (
    <ObjektView
      objekts={objekts}
      priority={priority}
      isSelected={isSelected}
      open={open}
    />
  );
}
