"use client";

import { useState } from "react";
import { Button } from "../ui";
import { IconFilter } from "@intentui/icons";

export function FilterContainer({ children }: React.PropsWithChildren) {
  const [open, setOpen] = useState(false);
  return (
    <div className="group flex flex-col gap-6 justify-center" data-show={open}>
      <Button
        intent="outline"
        className="flex sm:hidden"
        onClick={() => setOpen(!open)}
      >
        <IconFilter />
        Filters
      </Button>
      <div className="sm:group-data-[show=false]:flex group-data-[show=false]:hidden">
        {children}
      </div>
    </div>
  );
}
