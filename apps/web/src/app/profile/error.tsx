"use client";

import { useTranslations } from "next-intl";

import { ErrorRender } from "@/components/error-boundary";

function refresh() {
  window.location.reload();
}

export default function IndexError() {
  const t = useTranslations("error");
  return <ErrorRender onRetry={refresh} message={t("profile_loading")} />;
}
