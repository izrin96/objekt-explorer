import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { useCurrentUser } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

import { tabCountsOptions } from "./queries";

const ITEMS = [
  { label: m.trade_tab_browse, to: "/trade" },
  { label: m.trade_tab_for_you, to: "/trade/for-you", count: "forYou" },
  { label: m.trade_tab_mine, to: "/trade/mine", count: "mine" },
] as const;

const COUNT_CAP = 99;

/** Same pattern as `ProfileTabs`: each tab is a real `<Link>`, keyboard activation navigates. */
export function TradeTabs() {
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (state) => state.pathname });
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const signedIn = currentUser != null;
  const { data: counts } = useQuery(tabCountsOptions(signedIn));
  const paths = ITEMS.map((item) => router.buildLocation({ to: item.to }).pathname);
  // a trade page under My trades marks My trades
  const current =
    paths.findLast((path) => pathname === path || pathname.startsWith(`${path}/`)) ?? pathname;

  // the tab bar outlives each tab, so moving between tabs asks again; a fresh count is kept
  useEffect(() => {
    if (signedIn) void queryClient.prefetchQuery(tabCountsOptions(true));
  }, [queryClient, signedIn, current]);

  return (
    <Tabs
      value={current}
      onValueChange={(value, details) => {
        if (typeof value !== "string" || value === current) return;
        if (details.event?.type === "click") return;
        void navigate({ to: value });
      }}
      className="gap-0"
    >
      <TabsList
        variant="underline"
        aria-label={m.trade_tabs_label()}
        className="text-muted-foreground w-full justify-start gap-0.5 border-b py-0 *:data-[slot=tabs-tab]:hover:bg-transparent"
      >
        {ITEMS.map((item, i) => {
          const count = "count" in item ? (counts?.[item.count] ?? 0) : 0;
          const shown = count > COUNT_CAP ? `${COUNT_CAP}+` : String(count);
          return (
            <TabsTab
              key={item.to}
              value={paths[i]}
              nativeButton={false}
              aria-label={
                count > 0
                  ? m.trade_tab_with_count({ label: item.label(), count: shown })
                  : undefined
              }
              className="hover:text-foreground data-active:text-foreground h-9 grow-0 rounded-none px-3"
              render={<Link to={item.to} preload="intent" />}
            >
              {item.label()}
              {count > 0 ? (
                <span
                  aria-hidden
                  className="text-muted-foreground ms-1.5 font-mono text-xs tabular-nums"
                >
                  {shown}
                </span>
              ) : null}
            </TabsTab>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
