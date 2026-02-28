"use client";

import { useTranslations } from "next-intl";

import { Loader } from "../ui/loader";

export interface ObjektCountProps {
  filtered: unknown[];
  grouped?: unknown[];
  hasNextPage?: boolean;
}

export function ObjektCount({ filtered, grouped, hasNextPage }: ObjektCountProps) {
  const t = useTranslations("common.count");

  return (
    <span className={hasNextPage ? "flex items-center gap-2 font-semibold" : "font-semibold"}>
      <span>
        {t("total", { count: filtered.length.toLocaleString() })}
        {grouped ? ` (${t("types", { count: grouped.length.toLocaleString() })})` : ""}
      </span>
      {hasNextPage && <Loader variant="ring" className="size-4" />}
    </span>
  );
}
