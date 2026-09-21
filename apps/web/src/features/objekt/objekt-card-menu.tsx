import { DotsThreeIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Menu, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { m } from "@/paraglide/messages";

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
        <MenuTrigger
          aria-label={m.objekt_menu_aria()}
          className="relative z-10 grid size-[14cqi] place-items-center rounded-[4cqi] bg-[rgba(10,12,16,.78)] text-white backdrop-blur-sm outline-none focus-visible:ring-2 focus-visible:ring-white [&>svg]:size-[9cqi]"
        >
          <DotsThreeIcon weight="bold" />
        </MenuTrigger>
        <MenuPopup align="start" className="min-w-44">
          {children}
        </MenuPopup>
      </Menu>
    </div>
  );
}
