"use client";

import { useTranslations } from "next-intl";

import { Loader } from "../ui/loader";

export interface ObjektCountProps {
  filtered: unknown[];
  grouped?: unknown[];
  hasNextPage?: boolean;
  total?: number;
}

export function ObjektCount({ filtered, grouped, hasNextPage, total }: ObjektCountProps) {
  const t = useTranslations("common.count");

  const displayCount = total !== undefined ? total : filtered.length;
  const isLoading = hasNextPage && total === undefined;

  return (
    <span className={isLoading ? "flex items-center gap-2 font-semibold" : "font-semibold"}>
      <span>
        {t("total", { count: displayCount.toLocaleString() })}
        {grouped ? ` (${t("types", { count: grouped.length.toLocaleString() })})` : ""}
      </span>
      {isLoading && <Loader variant="ring" className="size-4" />}
    </span>
  );
}
