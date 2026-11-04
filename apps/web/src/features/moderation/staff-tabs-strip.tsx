import { Link, useLocation, useNavigate } from "@tanstack/react-router";

import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { m } from "@/paraglide/messages";

import { visibleTabs } from "./staff-tabs";

/** The staff area's strip, as `TradeTabs` does it: each tab a real `<Link>`. */
export function StaffTabs({ role }: { role: string | null }) {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (state) => state.pathname });
  const tabs = visibleTabs(role);
  // an account or address page under a tab marks that tab
  const current =
    tabs.find((tab) => pathname === tab.to || pathname.startsWith(`${tab.to}/`))?.to ?? pathname;

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
        aria-label={m.staff_tabs_label()}
        // six tabs, and longer ones in ko and ja, outgrow a phone: the strip scrolls
        data-scroll-x
        className="text-muted-foreground w-full [scrollbar-width:none] justify-start gap-0.5 overflow-x-auto border-b py-0 *:data-[slot=tabs-tab]:hover:bg-transparent [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => (
          <TabsTab
            key={tab.id}
            value={tab.to}
            nativeButton={false}
            className="hover:text-foreground data-active:text-foreground h-9 shrink-0 grow-0 rounded-none px-2.5 sm:px-3"
            render={<Link to={tab.to} preload="intent" />}
          >
            {tab.label()}
          </TabsTab>
        ))}
      </TabsList>
    </Tabs>
  );
}
