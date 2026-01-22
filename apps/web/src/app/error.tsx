"use client";

import { ErrorRender } from "@/components/error-boundary";

function refresh() {
  window.location.reload();
}

export default function IndexError() {
  return <ErrorRender onRetry={refresh} message="Error loading page" />;
}
