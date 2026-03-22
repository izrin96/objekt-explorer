import { useFilters } from "@/hooks/use-filters";
import { useTranslations } from "@/lib/i18n/context";

import { Toggle } from "../ui/toggle";

export default function TransferableFilter() {
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      isSelected={filters.transferable ?? false}
      onChange={(v) =>
        setFilters({
          transferable: !v ? null : true,
        })
      }
    >
      {t("transferable")}
    </Toggle>
  );
}
