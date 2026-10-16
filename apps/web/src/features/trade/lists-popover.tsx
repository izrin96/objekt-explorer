import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import type { getListLinkOption } from "@/features/list/list-link";
import { m } from "@/paraglide/messages";

import { ListRoleBadge } from "./list-role-badge";

export type PopoverList = {
  id: number;
  name: string;
  description?: string | null;
  type: ComponentProps<typeof ListRoleBadge>["type"];
  link: ReturnType<typeof getListLinkOption>;
};

/** "2 lists", opening the lists behind a post or a partner. */
export function ListsPopover({ lists }: { lists: readonly PopoverList[] }) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="xs" className="font-mono" />}>
        {m.trade_lists_count({ count: lists.length })}
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-72">
        <div className="flex flex-col gap-3">
          <PopoverTitle className="text-sm">{m.trade_partner_lists_title()}</PopoverTitle>
          <ul className="flex flex-col gap-1.5 text-sm">
            {lists.map((list) => (
              <li key={list.id} className="flex min-w-0 items-start gap-2">
                <ListRoleBadge type={list.type} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link
                    {...list.link}
                    className="min-w-0 break-words underline-offset-2 hover:underline"
                  >
                    {list.name}
                  </Link>
                  {list.description ? (
                    <p className="text-muted-foreground text-xs break-words">{list.description}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
