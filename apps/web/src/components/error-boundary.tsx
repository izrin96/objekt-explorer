"use client";

import { HeartBreakIcon } from "@phosphor-icons/react/dist/ssr";
import { useIntlayer } from "next-intlayer";

import { Button } from "./intentui/button";

export default function ErrorFallbackRender({
  resetErrorBoundary,
}: {
  resetErrorBoundary: () => void;
}) {
  const content = useIntlayer("common");
  return <ErrorRender onRetry={resetErrorBoundary} message={content.error.loading_data.value} />;
}

export function ErrorRender({ message, onRetry }: { message: string; onRetry: () => void }) {
  const content = useIntlayer("common");
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <HeartBreakIcon size={64} weight="light" />
      <span>{message}</span>
      <Button intent="outline" onPress={onRetry}>
        {content.error.retry.value}
      </Button>
    </div>
  );
}
