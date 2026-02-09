"use client";

import { useTranslations } from "next-intl";

import { useConfigStore } from "@/hooks/use-config";

import { Toggle } from "../ui/toggle";

export default function HideLabelFilter() {
  const t = useTranslations("filter");
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const setHideLabel = useConfigStore((a) => a.setHideLabel);
  return (
    <Toggle
      className="selected:border-border"
      intent="outline"
      isSelected={hideLabel}
      onChange={setHideLabel}
    >
      {hideLabel ? t("show_label") : t("hide_label")}
    </Toggle>
  );
}
