import { DotsThreeIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Menu, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { m } from "@/paraglide/messages";

import { objektControlClass } from "./objekt-card";

/**
 * The wrapper stops click and keydown propagation so menu interaction —
 * including portaled popups, which bubble through the React tree — never
 * toggles the card's selection.
 */
export function ObjektCardMenu({ children }: { children: ReactNode }) {
  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      className="contents"
    >
      <Menu>
        <MenuTrigger aria-label={m.objekt_menu_aria()} className={objektControlClass}>
          <DotsThreeIcon weight="bold" />
        </MenuTrigger>
        <MenuPopup align="end" className="min-w-44">
          {children}
        </MenuPopup>
      </Menu>
    </div>
  );
}
