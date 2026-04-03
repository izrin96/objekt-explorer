"use client";

import { useIntlayer } from "next-intlayer";
import { parseAsBoolean, useQueryState } from "nuqs";

import { Toggle } from "@/components/ui/toggle";

export function useShowCount() {
  return useQueryState("showCount", parseAsBoolean.withDefault(false));
}

export default function ShowCountFilter() {
  const content = useIntlayer("filter");
  const [showCount, setShowCount] = useShowCount();

  return (
    <Toggle intent="outline" isSelected={showCount ?? false} onChange={setShowCount}>
      {content.show_count.value}
    </Toggle>
  );
}
