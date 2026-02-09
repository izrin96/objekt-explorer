"use client";

import { useTranslations } from "next-intl";
import { useIsClient } from "usehooks-ts";

import { useWide } from "@/hooks/use-wide";

import { Toggle } from "../ui/toggle";

export default function WideFilter() {
  const t = useTranslations("filter");
  const { wide, setWide } = useWide();
  const isClient = useIsClient();
  if (!isClient) return;

  return (
    <Toggle
      intent="outline"
      isSelected={wide}
      onChange={setWide}
      className="selected:border-border hidden 2xl:block"
    >
      {wide ? t("compact") : t("wide")}
    </Toggle>
  );
}
