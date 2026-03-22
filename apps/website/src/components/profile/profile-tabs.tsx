import { useLocation } from "@tanstack/react-router";

import { useTarget } from "@/hooks/use-target";
import { useTranslations } from "@/lib/i18n/context";

import { TabLink, TabList, Tabs } from "../ui/tabs";

export default function ProfileTabs() {
  const t = useTranslations("profile.tabs");
  const profile = useTarget((a) => a.profile)!;
  const { pathname } = useLocation();
  const path = profile.nickname || profile.address;

  const items = [
    { url: `/@${path}`, translationKey: "collection" as const },
    { url: `/@${path}/trades`, translationKey: "trade_history" as const },
    { url: `/@${path}/progress`, translationKey: "progress" as const },
    { url: `/@${path}/stats`, translationKey: "statistics" as const },
    { url: `/@${path}/list`, translationKey: "lists" as const },
  ];

  return (
    <Tabs
      aria-label="Navbar"
      className="w-full overflow-x-auto px-3 py-1"
      selectedKey={decodeURIComponent(pathname)}
    >
      <TabList className="border-b-0">
        {items.map((item) => (
          <TabLink key={item.url} id={item.url} to={item.url} aria-label={t(item.translationKey)}>
            {t(item.translationKey)}
          </TabLink>
        ))}
      </TabList>
    </Tabs>
  );
}
