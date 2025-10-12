"use client";

import { ErrorRender } from "@/components/error-boundary";

export default function IndexError() {
  function refresh() {
    window.location.reload();
  }

  return <ErrorRender onRetry={refresh} message="Error loading profile" />;
}
