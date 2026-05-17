import { parseAsBoolean, useQueryState } from "nuqs";

import { Toggle } from "@/components/intentui/toggle";
import { m } from "@/paraglide/messages";

export function useShowCount() {
  return useQueryState("showCount", parseAsBoolean.withDefault(false));
}

export default function ShowCountFilter() {
  const [showCount, setShowCount] = useShowCount();

  return (
    <Toggle intent="outline" isSelected={showCount ?? false} onChange={setShowCount}>
      {m.filter_show_count()}
    </Toggle>
  );
}
