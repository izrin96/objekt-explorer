import type { ListRuleDef } from "@repo/api/schemas/list-rule";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { getListLinkOption } from "@/features/list/list-link";
import { ruleText } from "@/features/list/rules/words";
import { useUserLists } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

import { ListRoleBadge } from "./list-role-badge";
import { nearCountText, type SideNear } from "./near";
import { ruleCountsOf } from "./person-row";

type RuleMatch = { listId: number; ruleId: number; rule: ListRuleDef };

/**
 * A list's own count ("3 you have") as a button: it opens the viewer's lists the count was taken
 * against, and under a want list each of its rules the match went through, with how many. With
 * none of the lists at hand (the user's lists still loading) it stays plain text.
 */
export function MatchedListsChip({
  listIds,
  ruleMatches = [],
  near,
  className,
  children,
}: {
  listIds: readonly number[];
  /** the poster's collections the viewer wants only through a rule */
  ruleMatches?: readonly RuleMatch[];
  /** the viewer's lists behind the side's near matches, named after the counted ones */
  near?: SideNear;
  className: string;
  children: ReactNode;
}) {
  const lists = useUserLists();
  const ids = new Set(listIds);
  const matched = lists.filter((list) => ids.has(list.id));
  const nearIds = new Set(near?.listIds);
  const nearLists = lists.filter((list) => nearIds.has(list.id) && !ids.has(list.id));
  if (matched.length + nearLists.length === 0) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Popover>
      <PopoverTrigger
        className={`${className} focus-visible:ring-ring cursor-pointer outline-none focus-visible:ring-2`}
      >
        {children}
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-72">
        <div className="flex flex-col gap-2">
          <PopoverTitle className="text-sm">{m.trade_match_lists_title()}</PopoverTitle>
          <ul className="flex flex-col gap-1.5 text-sm">
            {matched.map((list) => (
              <li key={list.id} className="flex min-w-0 flex-col gap-1">
                <span className="flex min-w-0 items-center gap-2">
                  <ListRoleBadge type={list.listType} />
                  <Link
                    {...getListLinkOption(list)}
                    className="min-w-0 break-words underline-offset-2 hover:underline"
                  >
                    {list.name}
                  </Link>
                </span>
                {ruleCountsOf(ruleMatches, list.id).map(({ match, count }) => (
                  <span
                    key={match.ruleId}
                    className="text-muted-foreground flex min-w-0 items-baseline gap-1.5 ps-2 text-xs"
                  >
                    <span className="shrink-0">{m.trade_match_via_rule()}</span>
                    <span className="text-foreground min-w-0 truncate">{ruleText(match.rule)}</span>
                    <span className="ms-auto shrink-0 font-mono tabular-nums">{count}</span>
                  </span>
                ))}
              </li>
            ))}
            {near
              ? nearLists.map((list) => (
                  <li
                    key={list.id}
                    className="text-muted-foreground flex min-w-0 items-center gap-2"
                  >
                    <ListRoleBadge type={list.listType} />
                    <Link
                      {...getListLinkOption(list)}
                      className="min-w-0 break-words underline-offset-2 hover:underline"
                    >
                      {list.name}
                    </Link>
                    <span className="ms-auto shrink-0 text-xs">
                      {nearCountText(near.verb, near.count)}
                    </span>
                  </li>
                ))
              : null}
          </ul>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
