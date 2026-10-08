import { Link } from "@tanstack/react-router";

import { PopoverTitle } from "@/components/ui/popover";
import { getListLinkOption } from "@/features/list/list-link";
import { useUserLists } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

import { ListRoleBadge } from "./list-role-badge";
import type { BrowsePostData } from "./post-types";

/** The viewer's lists behind each count, in the match line's order. A sale list can feed You have. */
export function MatchedLists({ match }: { match: NonNullable<BrowsePostData["match"]> }) {
  const lists = useUserLists();
  const groups = [
    {
      key: "want",
      ids: match.wantListIds,
      count: m.trade_match_they_have({ count: match.youWant }),
    },
    {
      key: "have",
      ids: match.haveListIds,
      count: m.trade_match_you_have({ count: match.youHave }),
    },
  ];
  const rows = groups.flatMap((group) => {
    const ids = new Set(group.ids);
    const matched = lists.filter((list) => ids.has(list.id));
    return matched.length > 0 ? [{ key: group.key, count: group.count, matched }] : [];
  });
  return (
    <div className="flex flex-col gap-3">
      <PopoverTitle className="text-sm">{m.trade_match_lists_title()}</PopoverTitle>
      {rows.map(({ key, count, matched }) => (
        <section key={key} className="flex flex-col gap-1.5">
          <h4 className="text-muted-foreground text-xs tabular-nums">{count}</h4>
          <ul className="flex flex-col gap-1.5 text-sm">
            {matched.map((list) => (
              <li key={list.id} className="flex min-w-0 items-center gap-2">
                <ListRoleBadge type={list.listTypeNew} />
                <Link
                  {...getListLinkOption(list)}
                  className="min-w-0 break-words underline-offset-2 hover:underline"
                >
                  {list.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="border-t pt-2">
        <Link
          to="/list"
          className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
        >
          {m.nav_manage_list()}
        </Link>
      </div>
    </div>
  );
}
