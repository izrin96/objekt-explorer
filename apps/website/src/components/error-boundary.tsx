import { HeartBreakIcon } from "@phosphor-icons/react/dist/ssr";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, type PropsWithChildren } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { m } from "@/paraglide/messages";

import { Button } from "./intentui/button";
import { Loader } from "./intentui/loader";

export function ErrorRender({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <HeartBreakIcon size={64} weight="light" />
      <span>{message}</span>
      <Button intent="outline" onPress={onRetry}>
        {m.common_error_retry()}
      </Button>
    </div>
  );
}

export default function ErrorFallbackRender({
  resetErrorBoundary,
}: {
  resetErrorBoundary: () => void;
}) {
  return <ErrorRender onRetry={resetErrorBoundary} message={m.common_error_loading_data()} />;
}

// todo: rework and use useQueryErrorResetBoundary
export function CommonErrorComponent() {
  return (
    <ErrorRender onRetry={() => window.location.reload()} message={m.common_error_loading_data()} />
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
