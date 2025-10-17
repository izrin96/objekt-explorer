import { HeartBreakIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "./ui/button";

export default function ErrorFallbackRender({
  resetErrorBoundary,
}: {
  resetErrorBoundary: () => void;
}) {
  return <ErrorRender onRetry={resetErrorBoundary} message="Error loading data" />;
}

export function ErrorRender({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <HeartBreakIcon size={64} weight="light" />
      <p>{message}</p>
      <Button intent="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
