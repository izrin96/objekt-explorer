import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";

import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { m } from "@/paraglide/messages";

const ITEMS = [
  { label: m.trade_tab_browse, to: "/trade" },
  { label: m.trade_tab_for_you, to: "/trade/for-you" },
] as const;

/** Same pattern as `ProfileTabs`: each tab is a real `<Link>`, keyboard activation navigates. */
export function TradeTabs() {
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
      className="gap-0"
    >
      <TabsList
        variant="underline"
        aria-label={m.trade_tabs_label()}
        className="text-muted-foreground w-full justify-start gap-0.5 border-b py-0 *:data-[slot=tabs-tab]:hover:bg-transparent"
      >
        {ITEMS.map((item) => (
          <TabsTab
            key={item.to}
            value={router.buildLocation({ to: item.to }).pathname}
            nativeButton={false}
            className="hover:text-foreground data-active:text-foreground h-9 grow-0 rounded-none px-3"
            render={<Link to={item.to} preload="intent" />}
          >
            {item.label()}
          </TabsTab>
        ))}
      </TabsList>
    </Tabs>
  );
}
