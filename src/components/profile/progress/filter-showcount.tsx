import { parseAsBoolean, useQueryState } from "nuqs";
import { Toggle } from "@/components/ui";

export function useShowCount() {
  return useQueryState("showCount", parseAsBoolean.withDefault(false));
}

export default function ShowCountFilter() {
  const [showCount, setShowCount] = useShowCount();

  return (
    <Toggle
      intent="outline"
      className="font-medium data-selected:inset-ring-primary"
      isSelected={showCount ?? false}
      onChange={setShowCount}
    >
      Show Count
    </Toggle>
  );
}
