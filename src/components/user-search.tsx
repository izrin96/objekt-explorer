"use client";

import { useState } from "react";
import { ComboBox, Loader } from "./ui";
import { CosmoSearchResult } from "@/lib/universal/cosmo/auth";
import { useDebounceValue } from "usehooks-ts";
import { ofetch } from "ofetch";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";

export default function UserSearch() {
  const [query, setQuery] = useState<string>("");
  const [debouncedQuery] = useDebounceValue<string>(query, 200);

  const router = useRouter();

  const enable = debouncedQuery.length > 3;

  const { status, data } = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: () => {
      return ofetch<CosmoSearchResult>(`/api/user/search`, {
        query: { query: query },
      }).then((res) => res.results);
    },
    enabled: enable,
  });

  const navigateTo = (value: string) => {
    if (value) router.push(`/@${value}`);
    setQuery("");
  };

  return (
    <>
      {status === "pending" && enable && <Loader />}
      <ComboBox
        placeholder="Search user"
        aria-label="Search user"
        className="max-w-48"
        inputValue={query}
        onInputChange={setQuery}
        allowsEmptyCollection
        shouldFocusWrap
        onSelectionChange={(key) => navigateTo(key?.toString() ?? "")}
      >
        <ComboBox.Input />
        {status === "success" && data?.length > 0 && (
          <ComboBox.List items={data}>
            {(item) => (
              <ComboBox.Option id={item.nickname} textValue={item.nickname}>
                {item.nickname}
              </ComboBox.Option>
            )}
          </ComboBox.List>
        )}
      </ComboBox>
    </>
  );
}
