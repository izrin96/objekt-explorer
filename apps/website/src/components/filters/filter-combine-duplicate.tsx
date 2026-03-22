import { useFilters } from "@/hooks/use-filters";
import { useTranslations } from "@/lib/i18n/context";

import { Toggle } from "../ui/toggle";

export default function CombineDuplicateFilter() {
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      isSelected={filters.grouped ?? false}
      onChange={(v) =>
        setFilters({
          grouped: !v ? null : true,
        })
      }
    >
      {t("combine_dups")}
    </Toggle>
  );
}
