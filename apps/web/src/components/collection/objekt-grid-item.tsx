"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { ReactNode } from "react";

import { ObjektHoverMenu, ObjektSelect } from "../objekt/objekt-action";
import ObjektModal from "../objekt/objekt-modal";
import { ObjektViewSelectable } from "../objekt/objekt-selectable";
import ObjektView from "../objekt/objekt-view";

export interface ObjektViewProps {
  hideLabel?: boolean;
  showCount?: boolean;
  showSerial?: boolean;
  showOwned?: boolean;
  isFade?: boolean;
  unobtainable?: boolean;
  listCurrency?: string | null;
  onSetPrice?: () => void;
}

export interface ObjektGridItemProps {
  objekts: ValidObjekt[];
  session?: boolean;
  showSelect?: boolean;
  staticMenu?: ReactNode;
  hoverMenu?: ReactNode;
  overlay?: ReactNode;
  viewProps?: ObjektViewProps;
}

export function ObjektGridItem({
  objekts,
  session,
  showSelect = true,
  staticMenu,
  hoverMenu,
  overlay,
  viewProps,
}: ObjektGridItemProps) {
  const objekt = objekts[0];

  if (!objekt) return null;

  return (
    <ObjektModal
      key={objekt.id}
      objekts={objekts}
      showOwned={viewProps?.showOwned}
      menu={session && staticMenu}
    >
      <ObjektViewSelectable objekts={objekts}>
        {({ isSelected }) => (
          <ObjektView objekts={objekts} isSelected={isSelected} {...viewProps}>
            {session && (showSelect || hoverMenu) && (
              <div className="flex items-start self-start justify-self-end">
                {showSelect && <ObjektSelect objekts={objekts} />}
                {hoverMenu && <ObjektHoverMenu>{hoverMenu}</ObjektHoverMenu>}
              </div>
            )}
            {overlay}
          </ObjektView>
        )}
      </ObjektViewSelectable>
    </ObjektModal>
  );
}
