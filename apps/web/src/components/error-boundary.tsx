"use client";

import { HeartBreakIcon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";

import { Button } from "./ui/button";

export default function ErrorFallbackRender({
  resetErrorBoundary,
}: {
  resetErrorBoundary: () => void;
}) {
  const t = useTranslations("common.error");
  return <ErrorRender onRetry={resetErrorBoundary} message={t("loading_data")} />;
}

export function ErrorRender({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTranslations("common.error");
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <HeartBreakIcon size={64} weight="light" />
      <p>{message}</p>
      <Button intent="outline" onPress={onRetry}>
        {t("retry")}
      </Button>
    </div>
  );
}
