"use client";

import { useConfigStore } from "@/hooks/use-config";
import { Toggle } from "../ui";

export default function HideLabelFilter() {
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const setHideLabel = useConfigStore((a) => a.setHideLabel);
  return (
    <Toggle intent="outline" isSelected={hideLabel} onChange={setHideLabel}>
      {hideLabel ? "Show label" : "Hide label"}
    </Toggle>
  );
}
