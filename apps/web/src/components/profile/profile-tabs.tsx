"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useTarget } from "@/hooks/use-target";

import { Tab, TabList, Tabs } from "../ui/tabs";

export default function ProfileTabs() {
  const t = useTranslations("profile.tabs");
  const router = useRouter();
  const profile = useTarget((a) => a.profile)!;
  const pathname = usePathname();
  const path = profile.nickname || profile.address;

  const items = [
    { url: `/@${path}`, translationKey: "collection" as const },
    { url: `/@${path}/trades`, translationKey: "trade_history" as const },
    { url: `/@${path}/progress`, translationKey: "progress" as const },
    { url: `/@${path}/stats`, translationKey: "statistics" as const },
    { url: `/@${path}/list`, translationKey: "lists" as const },
  ];

  useEffect(() => {
    items.forEach((item) => router.prefetch(item.url));
  }, [path, router]);

  return (
    <Tabs
      aria-label="Navbar"
      className="w-full overflow-x-auto px-3 py-1"
      selectedKey={decodeURIComponent(pathname)}
    >
      <TabList className="border-b-0">
        {items.map((item) => (
          <Tab key={item.url} id={item.url} href={item.url} aria-label={t(item.translationKey)}>
            {t(item.translationKey)}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  );
}
