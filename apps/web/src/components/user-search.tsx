"use client";

import type { CosmoPublicUser, CosmoSearchResult } from "@repo/cosmo/types/user";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ofetch } from "ofetch";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";

import { useUserSearchStore } from "@/hooks/use-user-search-store";
import { getBaseURL } from "@/lib/utils";

import { Button } from "./ui/button";
import {
  CommandMenu,
  CommandMenuItem,
  CommandMenuList,
  CommandMenuSearch,
  CommandMenuSection,
} from "./ui/command-menu";

export default function UserSearch() {
  const t = useTranslations("nav.search_user");
  const recentUsers = useUserSearchStore((a) => a.users);
  const addRecent = useUserSearchStore((a) => a.add);
  const clearAll = useUserSearchStore((a) => a.clearAll);
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setQuery] = useDebounceValue<string>("", 350);
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
    router.push(`/@${user.nickname}`);
  };

  return (
    <>
      <Button onPress={() => setIsOpen(true)} size="sm" intent="primary">
        <MagnifyingGlassIcon data-slot="icon" />
        <span className="hidden sm:block">{t("label")}</span>
      </Button>
      <CommandMenu
        shortcut="k"
        isPending={enable && isPending}
        onInputChange={setQuery}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <CommandMenuSearch placeholder={t("placeholder")} />
        <CommandMenuList autoFocus="first" shouldFocusWrap>
          <CommandMenuSection label={t("result_label")}>
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
          <CommandMenuSection label={t("recent_label")}>
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
                      textValue="Clear all"
                      onAction={() => clearAll()}
                      intent="danger"
                    >
                      Clear history
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
