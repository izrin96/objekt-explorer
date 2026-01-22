import { parseAsBoolean, useQueryState } from "nuqs";

import { Toggle } from "@/components/ui/toggle";

export function useShowCount() {
  return useQueryState("showCount", parseAsBoolean.withDefault(false));
}

export default function ShowCountFilter() {
  const [showCount, setShowCount] = useShowCount();

  return (
    <Toggle intent="outline" isSelected={showCount ?? false} onChange={setShowCount}>
      Show Count
    </Toggle>
  );
}
