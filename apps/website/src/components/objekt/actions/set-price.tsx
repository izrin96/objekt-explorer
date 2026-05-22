import { CurrencyDollarIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";

import type { ButtonProps } from "@/components/intentui/button";
import { Button } from "@/components/intentui/button";
import { SetPriceModal } from "@/components/list/modal/set-price-modal";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { m } from "@/paraglide/messages";

export function SetPrice({ size }: { size?: ButtonProps["size"] }) {
  const [open, setOpen] = useState(false);
  const handleAction = useObjektSelect((a) => a.handleAction);
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  return (
    <>
      <SetPriceModal open={open} setOpen={setOpen} objekts={selected} />
      <Button size={size} intent="outline" onPress={() => handleAction(() => setOpen(true))}>
        <CurrencyDollarIcon weight="regular" />
        {m.filter_set_price()}
      </Button>
    </>
  );
}
