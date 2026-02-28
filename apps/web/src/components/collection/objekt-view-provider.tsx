"use client";

import { QueryErrorResetBoundary } from "@tanstack/react-query";
import type { PropsWithChildren, ReactNode } from "react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { ObjektColumnProvider } from "@/hooks/use-objekt-column";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";

import ErrorFallbackRender from "../error-boundary";
import { Loader } from "../ui/loader";

interface ObjektViewProviderProps extends PropsWithChildren {
  initialColumn?: number;
  modalTab: "owned" | "trades";
  withSelect?: boolean;
  suspenseFallback?: ReactNode;
}

export function ObjektViewProvider({
  initialColumn,
  modalTab,
  withSelect = true,
  suspenseFallback,
  children,
}: ObjektViewProviderProps) {
  const fallback = suspenseFallback ?? <ObjektViewLoader />;

  const content = (
    <ObjektColumnProvider initialColumn={initialColumn}>
      <ObjektModalProvider initialTab={modalTab}>
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
              <Suspense fallback={fallback}>{children}</Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </ObjektModalProvider>
    </ObjektColumnProvider>
  );

  if (withSelect) {
    return <ObjektSelectProvider>{content}</ObjektSelectProvider>;
  }

  return content;
}

export function ObjektViewLoader() {
  return (
    <div className="flex justify-center">
      <Loader variant="ring" />
    </div>
  );
}
