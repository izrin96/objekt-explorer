"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, CommandMenu, Keyboard } from "./ui";
import { useDebounceValue } from "usehooks-ts";
import { useQuery } from "@tanstack/react-query";
import { CosmoPublicUser, CosmoSearchResult } from "@/lib/universal/cosmo/auth";
import { ofetch } from "ofetch";
import { useRouter } from "nextjs-toploader/app";
import { IconSearch } from "justd-icons";
import { usePathname } from "next/navigation";

export default function UserSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<CosmoPublicUser[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounceValue<string>(query, 250);
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

  const onAction = useCallback(
    (nickname: string) => {
      setIsOpen(false);
      setQuery("");
      router.push(`/@${nickname}`);
    },
    [router, setIsOpen]
  );

  useEffect(() => {
    if (isPending) return;
    setResult(data ?? []);
  }, [isPending, data]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <Button onPress={() => setIsOpen(true)} size="small" intent="primary">
        <IconSearch />
        <span className="sm:block hidden">Search user</span>
        {/* <Keyboard className="-mr-1" keys="⌘K" /> */}
      </Button>
      <CommandMenu
        shortcut="k"
        isPending={enable && isPending}
        onInputChange={setQuery}
        inputValue={query}
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
      >
        <CommandMenu.Search placeholder="Search user..." />
        <CommandMenu.List
          autoFocus="first"
          shouldFocusWrap
          onAction={(key) => onAction(key.toString())}
        >
          <CommandMenu.Section title="Results">
            {result.map((user) => (
              <CommandMenu.Item
                key={user.nickname}
                id={user.nickname}
                textValue={user.nickname}
              >
                {user.nickname}
              </CommandMenu.Item>
            ))}
          </CommandMenu.Section>
        </CommandMenu.List>
      </CommandMenu>
    </>
  );
}
