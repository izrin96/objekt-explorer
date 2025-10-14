"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTarget } from "@/hooks/use-target";
import { Tab, TabList, Tabs } from "../ui/tabs";

export default function ProfileTabs() {
  const router = useRouter();
  const profile = useTarget((a) => a.profile)!;
  const pathname = usePathname();
  const path = profile.nickname ?? profile.address;

  const items = [
    { url: `/@${path}`, label: "Collection" },
    { url: `/@${path}/trades`, label: "Trade History" },
    { url: `/@${path}/progress`, label: "Progress" },
    { url: `/@${path}/stats`, label: "Statistics" },
  ];

  useEffect(() => {
    router.prefetch(`/@${path}`);
    router.prefetch(`/@${path}/trades`);
    router.prefetch(`/@${path}/stats`);
    router.prefetch(`/@${path}/progress`);
  }, [path]);

  return (
    <div className="overflow-x-auto">
      <Tabs aria-label="Navbar" className="w-min" selectedKey={decodeURIComponent(pathname)}>
        <TabList>
          {items.map((item) => (
            <Tab key={item.url} id={item.url} href={item.url} aria-label={item.label}>
              {item.label}
            </Tab>
          ))}
        </TabList>
      </Tabs>
    </div>
  );
}
