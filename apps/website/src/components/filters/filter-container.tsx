import { FunnelIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";

export function FilterContainer({ children }: React.PropsWithChildren) {
  const [open, setOpen] = useState(false);
  return (
    <div className="group flex flex-col justify-center gap-6" data-show={open}>
      <Button intent="outline" className="flex sm:hidden" onPress={() => setOpen(!open)}>
        <FunnelIcon />
        {m.filter_filters()}
      </Button>
      <div className="group-data-[show=false]:hidden sm:group-data-[show=false]:flex">
        {children}
      </div>
    </div>
  );
}
