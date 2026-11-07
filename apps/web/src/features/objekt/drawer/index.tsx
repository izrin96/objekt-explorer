import type { OwnedGridObjekt, ValidObjekt } from "@repo/lib/types/objekt";
import { type ReactNode, Suspense, lazy, useEffect, useState } from "react";

import { Drawer, DrawerPopup } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { preloadWhenIdle } from "@/lib/preload";

import type { DrawerTab } from "./body";
import type { OwnedRowMenu } from "./owned";

// the body (tabs, panels, the flip card) is its own chunk, fetched once the page is idle; the
// popup stays here, so a first open slides in at once even before the body has arrived
const loadBody = () => import("./body");
const DrawerBody = lazy(() => loadBody().then((mod) => ({ default: mod.DrawerBody })));

type Props = {
  objekt: ValidObjekt | null;
  onClose: () => void;
  defaultTab?: Extract<DrawerTab, "serials" | "market">;
  /**
   * Every copy of the open collection the surface's profile holds. Passing it
   * at all marks the surface an owned view, so an unowned collection still gets
   * the tab — empty — rather than the tab appearing and vanishing per card.
   */
  owned?: OwnedGridObjekt[];
  ownedMenu?: OwnedRowMenu;
  /** the card's check and menu are hover-only, so a touch surface reaches them here */
  selectable?: boolean;
  /** the items only; the sheet supplies the trigger and the popup */
  menu?: ReactNode;
  /** a linked serial: the sheet opens on its trade history */
  serial?: number;
  /** every serial the user moves to, so a surface can put it on the URL */
  onSerialChange?: (serial: number | undefined) => void;
  /** a line the surface puts above the card, such as why a Trade near match isn't counted */
  note?: ReactNode;
};

export function ObjektDrawer({
  objekt,
  onClose,
  defaultTab = "serials",
  owned,
  ownedMenu,
  selectable = false,
  menu,
  serial,
  onSerialChange,
  note,
}: Props) {
  const showOwned = owned !== undefined;
  useEffect(() => preloadWhenIdle(loadBody), []);
  // the body unmounts on close, so the chosen tab is held here instead: one
  // mount per page, so reopening keeps it and navigating away resets it
  const [tab, setTab] = useState<DrawerTab>(showOwned ? "owned" : defaultTab);

  // a linked serial switches to its tab once per objekt opened, so the user
  // can still leave it, and browsing serials does not pull them back
  const openId = objekt?.id ?? null;
  const [seenId, setSeenId] = useState<string | null>(null);
  if (openId !== seenId) {
    setSeenId(openId);
    if (openId !== null && serial !== undefined) setTab("serials");
  }

  return (
    <Drawer
      position="right"
      open={objekt !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* the kit's 48px gutter is kept on a phone: full width leaves no backdrop
          to tap, and the close button becomes the only way out */}
      <DrawerPopup showCloseButton className="sm:max-w-xl">
        {objekt && (
          <Suspense fallback={<BodyFallback />}>
            <DrawerBody
              key={objekt.id}
              objekt={objekt}
              initialSerial={serial}
              onSerialChange={onSerialChange}
              tab={tab}
              onTabChange={setTab}
              owned={owned}
              ownedMenu={ownedMenu}
              selectable={selectable}
              menu={menu}
              note={note}
            />
          </Suspense>
        )}
      </DrawerPopup>
    </Drawer>
  );
}

/** Stands in for the body on a first open that beats the idle preload. */
function BodyFallback() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="aspect-[5.5/8.5] w-full rounded-xl" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
