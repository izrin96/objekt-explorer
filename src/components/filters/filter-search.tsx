"use client";

import { QuestionMarkIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { useFilters } from "@/hooks/use-filters";
import { Button, Popover, TextField } from "../ui";

export default function SearchFilter() {
  const t = useTranslations("filter");
  const locale = useLocale();
  const [filters, setFilters] = useFilters();
  const [query, setQuery] = useState(filters.search ?? "");

  const [debounced] = useDebounceValue(query, 250);

  useEffect(() => {
    setFilters({ search: debounced === "" ? null : debounced });
  }, [debounced, setFilters]);

  useEffect(() => {
    // clear the text if reset
    if (!filters.search) {
      setQuery("");
    }
  }, [filters.search]);

  return (
    <TextField
      placeholder={t("quick_search")}
      onChange={setQuery}
      className="w-full min-w-50 max-w-72"
      value={query}
      aria-label="Search"
      suffix={
        query.length > 0 ? (
          <Button intent="plain" onClick={() => setQuery("")}>
            <XIcon data-slot="icon" />
          </Button>
        ) : (
          <Popover>
            <Button intent="plain">
              <QuestionMarkIcon data-slot="icon" />
            </Button>
            <Popover.Content className="prose max-w-sm p-4">
              {locale === "en" && (
                <>
                  <span>This quick search supports:</span>
                  <ul>
                    <li>OR query operation by comma</li>
                    <li>AND query operation by space</li>
                    <li>
                      NOT query operation by starting with an exclamation mark (example: !seoyeon,
                      !d201-202)
                    </li>
                    <li>Artist names (example: triples)</li>
                    <li>Member short names (example: naky, yy)</li>
                    <li>Class (example: special, sco)</li>
                    <li>Season (example: atom)</li>
                    <li>Collection numbers (example: d207)</li>
                    <li>Collection number ranges (example: 301z-302z)</li>
                    <li>Serial numbers (example: #1)</li>
                    <li>Serial number ranges (example: #1-20)</li>
                  </ul>
                  <span>Example: yy c201-204 !c202 #1-200, jw 201z, yb sco divine</span>
                </>
              )}
              {locale === "ko" && (
                <>
                  <span>이 빠른 검색에서는 다음을 지원합니다:</span>
                  <ul>
                    <li>쉼표(,)로 OR 조건 검색</li>
                    <li>공백으로 AND 조건 검색</li>
                    <li>느낌표(!)로 NOT 조건 검색 (예: !seoyeon, !d201-202)</li>
                    <li>아티스트 이름 (예: triples)</li>
                    <li>멤버 약칭 (예: naky, yy)</li>
                    <li>클래스 (예: special, sco)</li>
                    <li>시즌 (예: atom)</li>
                    <li>컬렉션 번호 (예: d207)</li>
                    <li>컬렉션 번호 범위 (예: 301z-302z)</li>
                    <li>시리얼 번호 (예: #1)</li>
                    <li>시리얼 번호 범위 (예: #1-20)</li>
                  </ul>
                  <span>예시: yy c201-204 !c202 #1-200, jw 201z, yb sco divine</span>
                </>
              )}
            </Popover.Content>
          </Popover>
        )
      }
    />
  );
}
