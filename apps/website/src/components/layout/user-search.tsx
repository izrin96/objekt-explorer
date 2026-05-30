import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import type { CosmoPublicUser, CosmoSearchResult } from "@repo/cosmo/types/user";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { ofetch } from "ofetch";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";

import { Button } from "@/components/intentui/button";
import {
  CommandMenu,
  CommandMenuItem,
  CommandMenuList,
  CommandMenuSearch,
  CommandMenuSection,
} from "@/components/intentui/command-menu";
import { useUserSearchStore } from "@/hooks/use-user-search-store";
import { m } from "@/paraglide/messages";

export default function UserSearch() {
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
      return ofetch<CosmoSearchResult>("/api/user/search", {
        query: { query: debouncedQuery },
      }).then((res) => res.results);
    },
    enabled: enable,
  });

  const handleAction = (user: CosmoPublicUser) => {
    setQuery("");
    setIsOpen(false);
    addRecent(user);
    void router.navigate({
      to: "/@{$nickname}",
      params: {
        nickname: user.nickname,
      },
    });
  };

  return (
    <>
      <Button
        onPress={() => setIsOpen(true)}
        size="sm"
        intent="plain"
        aria-label={m.nav_search_user_label()}
        className="[--btn-icon:var(--color-fg)]"
      >
        <MagnifyingGlassIcon />
        <span className="hidden sm:block">{m.nav_search_user_label()}</span>
      </Button>
      <CommandMenu
        shortcut="k"
        isPending={enable && isPending}
        onInputChange={setQuery}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <CommandMenuSearch placeholder={m.nav_search_user_placeholder()} />
        <CommandMenuList autoFocus="first" shouldFocusWrap>
          <CommandMenuSection label={m.nav_search_user_result_label()}>
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
          <CommandMenuSection label={m.nav_search_user_recent_label()}>
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
                      textValue={m.nav_search_user_clear_history()}
                      onAction={() => clearAll()}
                      intent="danger"
                    >
                      {m.nav_search_user_clear_history()}
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
