"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import type { CosmoPublicUser, CosmoSearchResult } from "@repo/cosmo/types/user";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { useIntlayer } from "next-intlayer";
import { useRouter } from "next/navigation";
import { ofetch } from "ofetch";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";

import { useUserSearchStore } from "@/hooks/use-user-search-store";
import { getBaseURL } from "@/lib/utils";

import { Button } from "./intentui/button";
import {
  CommandMenu,
  CommandMenuItem,
  CommandMenuList,
  CommandMenuSearch,
  CommandMenuSection,
} from "./intentui/command-menu";

export default function UserSearch() {
  const content = useIntlayer("nav");
  const recentUsers = useUserSearchStore((a) => a.users);
  const addRecent = useUserSearchStore((a) => a.add);
  const clearAll = useUserSearchStore((a) => a.clearAll);
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setQuery] = useDebounceValue("", 350);
  const enable = debouncedQuery.length > 0;

  const { data, isPending } = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: () => {
      const url = new URL("/api/user/search", getBaseURL());
      return ofetch<CosmoSearchResult>(url.toString(), {
        query: { query: debouncedQuery },
      }).then((res) => res.results);
    },
    enabled: enable,
  });

  const handleAction = (user: CosmoPublicUser) => {
    setQuery("");
    setIsOpen(false);
    addRecent(user);
    router.push(`/@${user.nickname}` as Route);
  };

  return (
    <>
      <Button onPress={() => setIsOpen(true)} size="sm" intent="primary">
        <MagnifyingGlassIcon data-slot="icon" />
        <span className="hidden sm:block">{content.search_user.label.value}</span>
      </Button>
      <CommandMenu
        shortcut="k"
        isPending={enable && isPending}
        onInputChange={setQuery}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <CommandMenuSearch placeholder={content.search_user.placeholder.value} />
        <CommandMenuList autoFocus="first" shouldFocusWrap>
          <CommandMenuSection label={content.search_user.result_label.value}>
            {data?.map((user) => (
              <CommandMenuItem
                onAction={() => handleAction(user)}
                key={`search-${user.address}`}
                id={`search-${user.address}`}
                textValue={user.nickname}
              >
                {user.nickname}
              </CommandMenuItem>
            ))}
          </CommandMenuSection>
          <CommandMenuSection label={content.search_user.recent_label.value}>
            {[
              ...recentUsers.map((user) => (
                <CommandMenuItem
                  onAction={() => handleAction(user)}
                  key={`recent-${user.address}`}
                  id={`recent-${user.address}`}
                  textValue={user.nickname}
                >
                  {user.nickname}
                </CommandMenuItem>
              )),
              ...(recentUsers.length > 0
                ? [
                    <CommandMenuItem
                      key="clear"
                      textValue={content.search_user.clear_history.value}
                      onAction={() => clearAll()}
                      intent="danger"
                    >
                      {content.search_user.clear_history.value}
                    </CommandMenuItem>,
                  ]
                : []),
            ]}
          </CommandMenuSection>
        </CommandMenuList>
      </CommandMenu>
    </>
  );
}
