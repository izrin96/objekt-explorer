"use client";

import { QuestionMarkIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";

import { useFilters } from "@/hooks/use-filters";

import { Button } from "../ui/button";
import { Input, InputGroup } from "../ui/input";
import { Popover, PopoverContent } from "../ui/popover";
import { TextField } from "../ui/text-field";

export default function SearchFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <SearchFilterField
      initialValue={filters.search ?? ""}
      onCommit={(value) => setFilters({ search: value === "" ? null : value })}
    />
  );
}

interface SearchFilterFieldProps {
  initialValue: string;
  onCommit: (value: string) => void;
}

function SearchFilterField({ initialValue, onCommit }: SearchFilterFieldProps) {
  const [localQuery, setLocalQuery] = useState(initialValue);
  const ref = useRef<HTMLInputElement>(null!);
  const t = useTranslations("filter");
  const [query, setQuery] = useState(initialValue);
  const debouncedCommit = useDebounceCallback(onCommit, 250);

  if (initialValue !== localQuery) {
    setLocalQuery(initialValue);
    setQuery(initialValue);
  }

  const handleChange = (value: string) => {
    setQuery(value);
    debouncedCommit(value);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        window.scrollTo({
          top: ref.current.getBoundingClientRect().y + window.scrollY - 150,
          behavior: "instant",
        });
        ref.current.focus({
          preventScroll: true,
        });
        ref.current.select();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <TextField
      onChange={handleChange}
      className="w-full max-w-72 min-w-50"
      value={query}
      aria-label="Search"
    >
      <InputGroup>
        <Input ref={ref} placeholder={t("quick_search")} />
        {query.length > 0 ? (
          <Button intent="plain" size="sq-xs" onPress={() => handleChange("")}>
            <XIcon data-slot="icon" />
          </Button>
        ) : (
          <Popover>
            <Button aria-label="Info" intent="plain" size="sq-xs">
              <QuestionMarkIcon data-slot="icon" />
            </Button>
            <PopoverContent className="flex max-w-sm flex-col gap-2 overflow-auto p-6">
              <span>{t("search_help.intro")}</span>
              <ul className="list-inside list-disc leading-6">
                <li>{t("search_help.or_operation")}</li>
                <li>{t("search_help.and_operation")}</li>
                <li>{t("search_help.not_operation")}</li>
                <li>{t("search_help.artist_names")}</li>
                <li>{t("search_help.member_short_names")}</li>
                <li>{t("search_help.class")}</li>
                <li>{t("search_help.season")}</li>
                <li>{t("search_help.collection_numbers")}</li>
                <li>{t("search_help.collection_ranges")}</li>
                <li>{t("search_help.serial_numbers")}</li>
                <li>{t("search_help.serial_ranges")}</li>
              </ul>
              <span>{t("search_help.example")}</span>
            </PopoverContent>
          </Popover>
        )}
      </InputGroup>
    </TextField>
  );
}
