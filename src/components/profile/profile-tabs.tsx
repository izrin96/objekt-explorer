"use client";

import React from "react";
import { Tabs } from "../ui";
import { usePathname } from "next/navigation";

export default function ProfileTabs({ nickname }: { nickname: string }) {
  const pathname = usePathname();
  return (
    <Tabs aria-label="Navbar" className="w-fit" selectedKey={pathname}>
      <Tabs.List
        items={[
          { url: `/@${nickname}`, label: "Collection" },
          { url: `/@${nickname}/trades`, label: "Trade History" },
        ]}
      >
        {(item) => (
          <Tabs.Tab id={item.url} href={item.url}>
            {item.label}
          </Tabs.Tab>
        )}
      </Tabs.List>
    </Tabs>
  );
}
