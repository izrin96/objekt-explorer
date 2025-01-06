"use client";

import React, { PropsWithChildren } from "react";
import { Tabs } from "../ui";
import { usePathname } from "next/navigation";

export default function ProfileTabs({
  children,
  nickname,
}: {
  nickname: string;
} & PropsWithChildren) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-4">
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
      {children}
    </div>
  );
}
