"use client";

import { FunnelIcon } from "@heroicons/react/24/outline";
import { useIntlayer } from "next-intlayer";
import { useState } from "react";

import { Button } from "../ui/button";

export function FilterContainer({ children }: React.PropsWithChildren) {
  const content = useIntlayer("filter");
  const [open, setOpen] = useState(false);
  return (
    <div className="group flex flex-col justify-center gap-6" data-show={open}>
      <Button intent="outline" className="flex sm:hidden" onPress={() => setOpen(!open)}>
        <FunnelIcon className="size-5" />
        {content.filters.value}
      </Button>
      <div className="group-data-[show=false]:hidden sm:group-data-[show=false]:flex">
        {children}
      </div>
    </div>
  );
}
