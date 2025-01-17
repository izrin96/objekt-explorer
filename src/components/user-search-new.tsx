"use client";

import { useState } from "react";
import { Button, CommandMenu, Keyboard } from "./ui";
import { useDebounceValue } from "usehooks-ts";
import { useQuery } from "@tanstack/react-query";
import { CosmoSearchResult } from "@/lib/universal/cosmo/auth";
import { ofetch } from "ofetch";
import { useRouter } from "nextjs-toploader/app";
import { IconSearch } from "justd-icons";

export default function UserSearchNew() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounceValue<string>(query, 200);
  const enable = debouncedQuery.length > 3;

  const { data, isPending } = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: () => {
      return ofetch<CosmoSearchResult>(`/api/user/search`, {
        query: { query: query },
      }).then((res) => res.results);
    },
    enabled: enable,
  });

  function onAction(nickname: string) {
    setIsOpen(false);
    router.push(`/@${nickname}`);
  }

  return (
    <>
      <Button onPress={() => setIsOpen(true)} size="small" appearance="outline">
        <IconSearch />
        <span className="text-muted-fg">Search user</span>
        <Keyboard className="-mr-1" keys="⌘K" />
      </Button>
      <CommandMenu
        shortcut="k"
        isPending={enable && isPending}
        onInputChange={setQuery}
        inputValue={query}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <CommandMenu.Search placeholder="Search user..." />
        {enable && !isPending && !data?.length && (
          <div className="col-span-full p-4 text-center text-muted-fg text-sm">
            No results found.
          </div>
        )}
        {!enable && (
          <div className="col-span-full p-4 text-center text-muted-fg text-sm">
            Enter minimum 4 characters.
          </div>
        )}
        <CommandMenu.List
          autoFocus="first"
          shouldFocusWrap
          onAction={(key) => onAction(key.toString())}
          items={data}
        >
          {(user) => (
            <CommandMenu.Item id={user.nickname} textValue={user.nickname}>
              {user.nickname}
            </CommandMenu.Item>
          )}
        </CommandMenu.List>
      </CommandMenu>
    </>
  );
}
