"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, CommandMenu } from "./ui";
import { useDebounceValue } from "usehooks-ts";
import { useQuery } from "@tanstack/react-query";
import { CosmoPublicUser, CosmoSearchResult } from "@/lib/universal/cosmo/auth";
import { ofetch } from "ofetch";
import { useRouter } from "nextjs-toploader/app";
import { usePathname } from "next/navigation";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { useUserSearchStore } from "@/hooks/use-user-search-store";

export default function UserSearch() {
  const recentUsers = useUserSearchStore((a) => a.users);
  const addRecent = useUserSearchStore((a) => a.add);
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

  const selectUser = useCallback(
    (user: CosmoPublicUser) => {
      setIsOpen(false);
      setQuery("");
      setResult([]);
      addRecent(user);
      router.push(`/@${user.nickname}`);
    },
    [router, setIsOpen, addRecent]
  );

  // set result after getting data
  useEffect(() => {
    if (isPending) return;
    setResult(data ?? []);
  }, [isPending, data]);

  // force close if pathname change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <Button onPress={() => setIsOpen(true)} size="small" intent="outline">
        <MagnifyingGlassIcon data-slot="icon" />
        <span className="sm:block hidden">Search user</span>
      </Button>
      <CommandMenu
        key={`${pathname}-${isOpen}`}
        shortcut="k"
        isPending={enable && isPending}
        onInputChange={setQuery}
        inputValue={query}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <CommandMenu.Search placeholder="Search user..." />
        <CommandMenu.List autoFocus="first" shouldFocusWrap>
          <CommandMenu.Section title="Results">
            {result.map((user) => (
              <CommandMenu.Item
                onAction={() => selectUser(user)}
                key={user.nickname}
                id={user.nickname}
                textValue={user.nickname}
              >
                {user.nickname}
              </CommandMenu.Item>
            ))}
          </CommandMenu.Section>
          <CommandMenu.Section title="Recents">
            {recentUsers.map((user) => (
              <CommandMenu.Item
                onAction={() => selectUser(user)}
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
