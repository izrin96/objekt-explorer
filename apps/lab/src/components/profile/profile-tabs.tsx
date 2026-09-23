import { Link, useLocation, useNavigate } from "@tanstack/react-router";

import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";

type Item = {
  label: string;
  to:
    | "/profile/$nickname"
    | "/profile/$nickname/activity"
    | "/profile/$nickname/progress"
    | "/profile/$nickname/stats"
    | "/profile/$nickname/lists";
  /** which of the two counts the tab shows after its label, if any */
  count?: "collection" | "lists";
};

/** every tab is routed now, so there is no `disabled` / `nativeButton` branch left */
const ITEMS: Item[] = [
  { label: "Collection", to: "/profile/$nickname", count: "collection" },
  { label: "Activity", to: "/profile/$nickname/activity" },
  { label: "Progress", to: "/profile/$nickname/progress" },
  { label: "Statistics", to: "/profile/$nickname/stats" },
  { label: "Lists", to: "/profile/$nickname/lists", count: "lists" },
];

/**
 * URL-driven tabs: `value` is the current pathname, every Tab is a real
 * TanStack `<Link>` (via Base UI `render`), so middle-click / hover-preload /
 * back-forward all work. Click navigation is done by the Link itself; the
 * `onValueChange` handler only navigates for keyboard activation (arrow keys
 * move selection without firing the Link's click).
 */
export function ProfileTabs({
  nickname,
  count,
  listCount,
}: {
  nickname: string;
  /** objekts owned, as the header's own stat counts them */
  count: number;
  /** lists bound to this profile; the same number `ListsView` renders cards for */
  listCount: number;
}) {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (s) => s.pathname });

  return (
    <Tabs
      value={pathname}
      onValueChange={(value, details) => {
        if (typeof value !== "string" || value === pathname) return;
        if (details.event?.type === "click") return; // Link already handled it
        void navigate({ to: value });
      }}
      /* the strip scrolls, the page does not: `data-scroll-x` tells the dev
         overflow guard this one is deliberate. The fade only exists below `md`,
         where the five tabs cannot fit. */
      data-scroll-x
      className="-mx-5 [scrollbar-width:none] gap-0 overflow-x-auto px-5 max-md:mask-r-from-[calc(100%-2rem)]"
    >
      <TabsList
        variant="underline"
        aria-label="Profile sections"
        /* `w-max min-w-full`, not `w-full`: `w-full` clamps the list — and so
           the underline rule — to the scroller's width while the tabs spill
           past it, which is what read as "clipped instead of scrolling" */
        className="text-muted-foreground w-max min-w-full justify-start gap-0.5 border-b py-0 *:data-[slot=tabs-tab]:hover:bg-transparent"
      >
        {ITEMS.map((item) => {
          const value = item.to.replace("$nickname", nickname);
          const n =
            item.count === "collection" ? count : item.count === "lists" ? listCount : undefined;
          return (
            <TabsTab
              key={item.label}
              value={value}
              // every tab renders as an <a>, so none of them is a native button
              nativeButton={false}
              className="hover:text-foreground data-active:text-foreground h-9 grow-0 rounded-none px-3 text-[13.5px]"
              render={
                <Link to={item.to} params={{ nickname }} preload="intent" resetScroll={false} />
              }
            >
              {item.label}
              {n !== undefined && (
                <span className="text-muted-foreground/70 ml-1.5 font-mono text-[11px]">{n}</span>
              )}
            </TabsTab>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
