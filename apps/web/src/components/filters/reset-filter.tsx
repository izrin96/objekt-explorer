"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";

import { Button } from "../ui/button";

export default function ResetFilter({
  onReset,
  isDisabled,
}: {
  onReset: () => void;
  isDisabled?: boolean;
}) {
  const t = useTranslations("filter");
  return (
    <Button intent="outline" onClick={onReset} isDisabled={isDisabled}>
      <XIcon data-slot="icon" />
      {t("reset_filter")}
    </Button>
  );
}
