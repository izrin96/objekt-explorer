import { validOnlineTypes, type ValidOnlineType } from "@repo/cosmo/types/common";

import { m } from "@/paraglide/messages";

import { ONLINE_TYPE_LABEL } from "./labels";
import { SingleSelect } from "./single-select";
import { useFilters, useSetFilters } from "./use-filters";

/** `all` is the absence of `on_offline`, spelled as a value the select can hold */
const ALL_TYPES = "all";

export function OnlineFilter({ className }: { className?: string }) {
  const onOffline = useFilters((f) => f.on_offline);
  const setFilters = useSetFilters();
  // built per render, not at module load: a message read at module scope is
  // resolved once in the base locale on the server and mismatches on hydration
  const options = [
    { value: ALL_TYPES, label: m.filter_all() },
    ...validOnlineTypes.map((value) => ({ value, label: ONLINE_TYPE_LABEL[value]() })),
  ];

  return (
    <SingleSelect
      label={m.filter_type()}
      options={options}
      value={onOffline?.[0] ?? ALL_TYPES}
      defaultValue={ALL_TYPES}
      onChange={(value) =>
        setFilters({
          on_offline: value === ALL_TYPES ? undefined : [value as ValidOnlineType],
        })
      }
      className={className}
    />
  );
}
