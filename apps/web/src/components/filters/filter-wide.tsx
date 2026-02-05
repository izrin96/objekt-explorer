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
      className="selected:border-border hidden 2xl:block"
    >
      {wide ? "Compact" : "Wide"}
    </Toggle>
  );
}
