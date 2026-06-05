import { DotsThreeVerticalIcon } from "@phosphor-icons/react/dist/ssr";
import type { PropsWithChildren } from "react";

import { Button } from "@/components/intentui/button";
import { Menu, MenuContent } from "@/components/intentui/menu";
import { m } from "@/paraglide/messages";

export function ObjektStaticMenu({ children }: PropsWithChildren) {
  return (
    <Menu>
      <Button
        className="absolute top-1 right-10 z-50 p-2 sm:top-2"
        size="sq-xs"
        intent="outline"
        aria-label={m.objekt_menu_aria()}
      >
        <DotsThreeVerticalIcon size={16} weight="bold" />
      </Button>
      <MenuContent placement="bottom right" popover={{ offset: -2 }}>
        {children}
      </MenuContent>
    </Menu>
  );
}
