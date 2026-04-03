"use client";

import { useIntlayer } from "next-intlayer";

import { ErrorRender } from "@/components/error-boundary";

function refresh() {
  window.location.reload();
}

export default function IndexError() {
  const content = useIntlayer("error");
  return <ErrorRender onRetry={refresh} message={content.list_loading.value} />;
}
