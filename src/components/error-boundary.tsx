import { IconBrokenHeart } from "@intentui/icons";
import { Button } from "./ui";

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
      <IconBrokenHeart className="size-12" />
      <p>{message}</p>
      <Button intent="secondary" onPress={onRetry}>
        Retry
      </Button>
    </div>
  );
}
