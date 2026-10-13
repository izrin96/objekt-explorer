import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { CatchBoundary } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/**
 * Keeps a widget's crash inside the widget, so a chart or a message that throws does
 * not take the route's page down with it. `as="li"` keeps a list's markup valid.
 */
export function WidgetBoundary({
  children,
  resetKey,
  as = "div",
  className,
}: {
  children: ReactNode;
  /** a change clears the error, e.g. the slug the widget shows */
  resetKey?: unknown;
  as?: "div" | "li";
  className?: string;
}) {
  return (
    <CatchBoundary
      getResetKey={() => resetKey}
      errorComponent={({ reset }) => <WidgetError as={as} className={className} onRetry={reset} />}
    >
      {children}
    </CatchBoundary>
  );
}

function WidgetError({
  as: Tag,
  className,
  onRetry,
}: {
  as: "div" | "li";
  className?: string;
  onRetry: () => void;
}) {
  const queryReset = useQueryErrorResetBoundary();
  return (
    <Tag
      className={cn(
        "text-muted-foreground flex items-center justify-center gap-2 py-4 text-sm",
        className,
      )}
    >
      {m.common_error_loading_data()}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          // a thrown query keeps its error until reset, so the retry would rethrow it
          queryReset.reset();
          onRetry();
        }}
      >
        <ArrowClockwiseIcon />
        {m.common_error_retry()}
      </Button>
    </Tag>
  );
}
