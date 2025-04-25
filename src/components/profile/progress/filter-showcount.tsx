import { Toggle } from "@/components/ui";
import { parseAsBoolean, useQueryState } from "nuqs";

export function useShowCount() {
  return useQueryState("showCount", parseAsBoolean.withDefault(false));
}

export default function ShowCountFilter() {
  const [showCount, setShowCount] = useShowCount();

  return (
    <Toggle
      className="data-selected:inset-ring-primary font-medium"
      isSelected={showCount ?? false}
      onChange={setShowCount}
    >
      Show Count
    </Toggle>
  );
}
