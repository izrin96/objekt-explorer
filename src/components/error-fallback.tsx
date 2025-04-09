import { IconBrokenChainLink } from "@intentui/icons";
import { Button } from "./ui";

export default function ErrorFallbackRender({
  resetErrorBoundary,
}: {
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex flex-col justify-center gap-3 items-center">
      <IconBrokenChainLink className="size-12" />
      <p>Error loading data</p>
      <Button intent="secondary" onPress={resetErrorBoundary}>
        Retry
      </Button>
    </div>
  );
}
