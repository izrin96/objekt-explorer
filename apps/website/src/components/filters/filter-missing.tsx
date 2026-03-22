import { useFilters } from "@/hooks/use-filters";
import { useTranslations } from "@/lib/i18n/context";

import { Toggle } from "../ui/toggle";

export default function MissingFilter() {
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      isSelected={(filters.unowned ?? false) || (filters.missing ?? false)}
      onChange={(v) =>
        setFilters({
          unowned: null,
          missing: !v ? null : true,
        })
      }
    >
      {t("show_missing")}
    </Toggle>
  );
}
