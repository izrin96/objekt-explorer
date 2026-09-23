import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";

import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { m } from "@/paraglide/messages";

type Item = {
  label: () => string;
  to:
    | "/@{$nickname}"
    | "/@{$nickname}/trades"
    | "/@{$nickname}/progress"
    | "/@{$nickname}/stats"
    | "/@{$nickname}/list";
};

const ITEMS: Item[] = [
  { label: m.profile_tabs_collection, to: "/@{$nickname}" },
  { label: m.profile_tabs_trade_history, to: "/@{$nickname}/trades" },
  { label: m.profile_tabs_progress, to: "/@{$nickname}/progress" },
  { label: m.profile_tabs_statistics, to: "/@{$nickname}/stats" },
  { label: m.profile_tabs_lists, to: "/@{$nickname}/list" },
];

// Spin's collection is paged from the server, so the tabs that need it whole go
const SPIN_ITEMS = ITEMS.slice(0, 2);

/**
 * `value` is the current pathname and every tab is a real `<Link>`, so
 * middle-click, hover-preload and back-forward all work. Click navigation is
 * the Link's; `onValueChange` only handles keyboard activation, which moves
 * selection without firing the Link's click.
 */
export function ProfileTabs({ nickname, spin }: { nickname: string; spin: boolean }) {
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (state) => state.pathname });

  return (
    <Tabs
      value={pathname}
      onValueChange={(value, details) => {
        if (typeof value !== "string" || value === pathname) return;
        if (details.event?.type === "click") return;
        void navigate({ to: value });
      }}
      /* the strip scrolls, the page does not: `data-scroll-x` tells the dev
         overflow guard this one is deliberate */
      data-scroll-x
      className="-mx-5 [scrollbar-width:none] gap-0 overflow-x-auto px-5 max-md:mask-r-from-[calc(100%-2rem)]"
    >
      <TabsList
        variant="underline"
        aria-label={m.profile_tabs_aria_label()}
        /* `w-max min-w-full`, not `w-full`: `w-full` clamps the underline rule
           to the scroller's width while the tabs spill past it */
        className="text-muted-foreground w-max min-w-full justify-start gap-0.5 border-b py-0 *:data-[slot=tabs-tab]:hover:bg-transparent"
      >
        {(spin ? SPIN_ITEMS : ITEMS).map((item) => (
          <TabsTab
            key={item.to}
            /* the built location, not the template with the name pasted in: a
               nickname outside ASCII reaches `pathname` percent-encoded */
            value={router.buildLocation({ to: item.to, params: { nickname } }).pathname}
            nativeButton={false}
            className="hover:text-foreground data-active:text-foreground h-9 grow-0 rounded-none px-3"
            render={
              <Link to={item.to} params={{ nickname }} preload="intent" resetScroll={false} />
            }
          >
            {item.label()}
          </TabsTab>
        ))}
      </TabsList>
    </Tabs>
  );
}
