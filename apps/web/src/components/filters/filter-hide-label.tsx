"use client";

import { useConfigStore } from "@/hooks/use-config";

import { Toggle } from "../ui/toggle";

export default function HideLabelFilter() {
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const setHideLabel = useConfigStore((a) => a.setHideLabel);
  return (
    <Toggle
      className="selected:inset-ring-fg/15"
      intent="outline"
      isSelected={hideLabel}
      onChange={setHideLabel}
    >
      {hideLabel ? "Show label" : "Hide label"}
    </Toggle>
  );
}
