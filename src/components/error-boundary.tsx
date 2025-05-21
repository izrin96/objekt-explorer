import { Button } from "./ui";
import { HeartBreakIcon } from "@phosphor-icons/react/dist/ssr";

export default function ErrorFallbackRender({
  resetErrorBoundary,
}: {
  resetErrorBoundary: () => void;
}) {
  return <Error onRetry={resetErrorBoundary} message="Error loading data" />;
}

export function Error({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col justify-center gap-3 items-center">
      <HeartBreakIcon size={64} weight="light" />
      <p>{message}</p>
      <Button intent="secondary" onPress={onRetry}>
        Retry
      </Button>
    </div>
  );
}
