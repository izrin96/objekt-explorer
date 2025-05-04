"use client";

import { Error } from "@/components/error-boundary";

export default function IndexError() {
  function refresh() {
    window.location.reload();
  }

  return <Error onRetry={refresh} message="Error loading list" />;
}
