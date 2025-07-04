"use client";

import { IconFilter } from "@intentui/icons";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "../ui";

export function FilterContainer({ children }: React.PropsWithChildren) {
  const t = useTranslations("filter");
  const [open, setOpen] = useState(false);
  return (
    <div className="group flex flex-col justify-center gap-6" data-show={open}>
      <Button intent="outline" className="flex sm:hidden" onClick={() => setOpen(!open)}>
        <IconFilter />
        {t("filters")}
      </Button>
      <div className="group-data-[show=false]:hidden sm:group-data-[show=false]:flex">
        {children}
      </div>
    </div>
  );
}
