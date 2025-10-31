"use client";

import { useIsClient } from "usehooks-ts";
import { useWide } from "@/hooks/use-wide";
import { Toggle } from "../ui/toggle";

export default function WideFilter() {
  const { wide, setWide } = useWide();
  const isClient = useIsClient();
  if (!isClient) return;

  return (
    <Toggle
      intent="outline"
      isSelected={wide}
      onChange={setWide}
      className="selected:inset-ring-fg/15 hidden xl:block"
    >
      {wide ? "Compact" : "Wide"}
    </Toggle>
  );
}
