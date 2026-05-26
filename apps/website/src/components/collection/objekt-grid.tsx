import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { ReactNode } from "react";

import {
  ObjektHoverMenu,
  ObjektOverlay as ObjektOverlayBase,
  ObjektSelect,
} from "../objekt/objekt-card-ui";
import ObjektModal from "../objekt/objekt-modal";
import { ObjektViewSelectable } from "../objekt/objekt-selectable";
import ObjektView from "../objekt/objekt-view";
import { useObjektShowOwned } from "./objekt-view-provider";

export interface ObjektGridViewProps {
  objekts: ValidObjekt[];
  hideLabel?: boolean;
  showCount?: boolean;
  showSerial?: boolean;
  isPriority?: boolean;
  isFade?: boolean;
  unobtainable?: boolean;
  listCurrency?: string | null;
  onSetPrice?: () => void;
  staticMenu?: ReactNode;
  children?: ReactNode;
}

function ObjektGridView({
  objekts,
  hideLabel,
  showCount,
  showSerial,
  isPriority,
  isFade,
  unobtainable,
  listCurrency,
  onSetPrice,
  staticMenu,
  children,
}: ObjektGridViewProps) {
  const showOwned = useObjektShowOwned();
  const objekt = objekts[0];

  if (!objekt) return null;

  return (
    <ObjektModal key={objekt.id} objekts={objekts} showOwned={showOwned} menu={staticMenu}>
      <ObjektViewSelectable objekts={objekts}>
        {({ isSelected }) => (
          <ObjektView
            objekts={objekts}
            isSelected={isSelected}
            hideLabel={hideLabel}
            showCount={showCount}
            showSerial={showSerial}
            isPriority={isPriority}
            isFade={isFade}
            unobtainable={unobtainable}
            listCurrency={listCurrency}
            onSetPrice={onSetPrice}
          >
            {children}
          </ObjektView>
        )}
      </ObjektViewSelectable>
    </ObjektModal>
  );
}

interface ObjektGridSelectProps {
  objekts: ValidObjekt[];
}

function ObjektGridSelect({ objekts }: ObjektGridSelectProps) {
  return <ObjektSelect objekts={objekts} />;
}

interface ObjektGridHoverMenuProps {
  children: ReactNode;
}

function ObjektGridHoverMenu({ children }: ObjektGridHoverMenuProps) {
  return <ObjektHoverMenu>{children}</ObjektHoverMenu>;
}

interface ObjektGridActionsProps {
  objekts: ValidObjekt[];
  children: ReactNode;
}

function ObjektGridActions({ objekts, children }: ObjektGridActionsProps) {
  return (
    <div className="flex items-start self-start justify-self-end overflow-hidden">
      <ObjektSelect objekts={objekts} />
      <ObjektHoverMenu>{children}</ObjektHoverMenu>
    </div>
  );
}

interface ObjektGridOverlayProps {
  isPin?: boolean;
  isLocked?: boolean;
}

function ObjektGridOverlay({ isPin, isLocked }: ObjektGridOverlayProps) {
  return <ObjektOverlayBase isPin={isPin} isLocked={isLocked} />;
}

export const ObjektGrid = {
  View: ObjektGridView,
  Select: ObjektGridSelect,
  HoverMenu: ObjektGridHoverMenu,
  Actions: ObjektGridActions,
  Overlay: ObjektGridOverlay,
};
