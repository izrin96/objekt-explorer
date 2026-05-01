import { HeartBreakIcon } from "@phosphor-icons/react/dist/ssr";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, type PropsWithChildren } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useIntlayer } from "react-intlayer";

import { Button } from "./intentui/button";
import { Loader } from "./intentui/loader";

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

export default function ErrorFallbackRender({
  resetErrorBoundary,
}: {
  resetErrorBoundary: () => void;
}) {
  const content = useIntlayer("common");
  return <ErrorRender onRetry={resetErrorBoundary} message={content.error.loading_data.value} />;
}

// todo: rework and use useQueryErrorResetBoundary
export function CommonErrorComponent() {
  const content = useIntlayer("common");
  return (
    <ErrorRender
      onRetry={() => window.location.reload()}
      message={content.error.loading_data.value}
    />
  );
}

export function QueryErrorResetWrapper({ children }: PropsWithChildren) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
          <Suspense
            fallback={
              <div className="flex justify-center py-2">
                <Loader variant="ring" />
              </div>
            }
          >
            {children}
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
