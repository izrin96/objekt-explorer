"use client";

import { useIsClient, useMediaQuery } from "usehooks-ts";
import { useWide } from "@/hooks/use-wide";
import { Toggle } from "../ui";

export default function WideFilter() {
  const { wide, setWide } = useWide();
  const isClient = useIsClient();
  const isMax = useMediaQuery("(min-width: 1280px)");
  if (!isClient || !isMax) return;

  return (
    <Toggle intent="outline" isSelected={wide} onChange={setWide}>
      {wide ? "Compact" : "Wide"}
    </Toggle>
  );
}
