"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "nextjs-toploader/app";
import { ofetch } from "ofetch";
import { useCallback, useEffect, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { useUserSearchStore } from "@/hooks/use-user-search-store";
import type { CosmoPublicUser, CosmoSearchResult } from "@/lib/universal/cosmo/auth";
import { Button, CommandMenu } from "./ui";

export default function UserSearch() {
  const t = useTranslations("nav.search_user");
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
    [router, setIsOpen, addRecent],
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
      <Button onPress={() => setIsOpen(true)} size="md" intent="outline">
        <MagnifyingGlassIcon data-slot="icon" />
        <span className="hidden sm:block">{t("label")}</span>
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
        <CommandMenu.Search placeholder={t("placeholder")} />
        <CommandMenu.List autoFocus="first" shouldFocusWrap>
          <CommandMenu.Section title={t("result_label")}>
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
          <CommandMenu.Section title={t("recent_label")}>
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
