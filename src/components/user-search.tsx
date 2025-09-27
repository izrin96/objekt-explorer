"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ofetch } from "ofetch";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { useUserSearchStore } from "@/hooks/use-user-search-store";
import type { CosmoPublicUser, CosmoSearchResult } from "@/lib/universal/cosmo/auth";
import {
  Button,
  CommandMenu,
  CommandMenuItem,
  CommandMenuList,
  CommandMenuSearch,
  CommandMenuSection,
} from "./ui";

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
      return ofetch<CosmoSearchResult>(`/api/user/search`, {
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
      <Button onClick={() => setIsOpen(true)} size="sm" intent="primary">
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
          <CommandMenuSection title={t("result_label")}>
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
          <CommandMenuSection title={t("recent_label")}>
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
                      isDanger
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
