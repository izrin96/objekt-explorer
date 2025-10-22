import { HeartBreakIcon } from "@phosphor-icons/react/dist/ssr";
import type { ErrorComponentProps } from "@tanstack/react-router";
import type { FallbackProps } from "react-error-boundary";
import { Button } from "./ui/button";

export default function ErrorFallbackRender({ resetErrorBoundary }: FallbackProps) {
  return <ErrorRender onRetry={resetErrorBoundary} message="Error loading data" />;
}

export function ErrorRender({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <HeartBreakIcon size={64} weight="light" />
      <span>{message}</span>
      <Button intent="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export function PostErrorComponent({ reset }: ErrorComponentProps) {
  return <ErrorRender message="Error loading data" onRetry={reset} />;
}
