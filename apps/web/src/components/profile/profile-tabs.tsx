"use client";

import { Addresses } from "@repo/lib";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import type { PublicProfile } from "@/lib/universal/user";

import { Tab, TabList, Tabs } from "../ui/tabs";

export default function ProfileTabs({ user }: { user: PublicProfile }) {
  const t = useTranslations("profile.tabs");
  const router = useRouter();
  const pathname = usePathname();
  const path = user.nickname || user.address;

  const disabled = user.address.toLowerCase() === Addresses.SPIN;

  const items = [
    { url: `/@${path}` as Route, translationKey: "collection" as const },
    { url: `/@${path}/trades` as Route, translationKey: "trade_history" as const },
    { url: `/@${path}/progress` as Route, translationKey: "progress" as const, disabled },
    { url: `/@${path}/stats` as Route, translationKey: "statistics" as const, disabled },
    { url: `/@${path}/list` as Route, translationKey: "lists" as const, disabled },
  ];

  useEffect(() => {
    items.forEach((item) => router.prefetch(item.url));
  }, [path, router]);

  const filteredItems = items.filter((a) => !a.disabled);

  return (
    <Tabs
      aria-label="Navbar"
      className="w-full overflow-x-auto px-3 py-1"
      selectedKey={decodeURIComponent(pathname)}
    >
      <TabList className="border-b-0">
        {filteredItems.map((item) => (
          <Tab key={item.url} id={item.url} href={item.url} aria-label={t(item.translationKey)}>
            {t(item.translationKey)}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  );
}
