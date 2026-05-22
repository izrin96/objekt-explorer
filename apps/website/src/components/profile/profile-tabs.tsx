import { Addresses } from "@repo/lib";
import { linkOptions, useLocation, useRouter } from "@tanstack/react-router";

import type { PublicProfile } from "@/lib/universal/user";
import { m } from "@/paraglide/messages";

import { TabLink, TabList, Tabs } from "../intentui/tabs";

export default function ProfileTabs({ user }: { user: PublicProfile }) {
  const router = useRouter();
  const pathname = useLocation({ select: (s) => s.pathname });
  const nickname = user.nickname || user.address.toLowerCase();

  const disabled = user.address.toLowerCase() === Addresses.SPIN;

  const items = linkOptions([
    {
      to: `/@{$nickname}`,
      params: { nickname },
      label: m.profile_tabs_collection(),
      disabled: false,
    },
    {
      to: `/@{$nickname}/trades`,
      params: { nickname },
      label: m.profile_tabs_trade_history(),
      disabled: false,
    },
    {
      to: `/@{$nickname}/progress`,
      params: { nickname },
      label: m.profile_tabs_progress(),
      disabled,
    },
    {
      to: `/@{$nickname}/stats`,
      params: { nickname },
      label: m.profile_tabs_statistics(),
      disabled,
    },
    { to: `/@{$nickname}/list`, params: { nickname }, label: m.profile_tabs_lists(), disabled },
  ]);

  const filteredItems = items.filter((a) => !a.disabled);

  return (
    <Tabs aria-label="Navbar" className="w-full overflow-x-auto px-3 py-1" selectedKey={pathname}>
      <TabList className="border-b-0">
        {filteredItems.map(({ label, disabled: _, ...item }) => {
          const pathname = router.buildLocation(item).pathname;
          return (
            <TabLink {...item} id={pathname} key={pathname} aria-label={label} resetScroll={false}>
              {label}
            </TabLink>
          );
        })}
      </TabList>
    </Tabs>
  );
}
