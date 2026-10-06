import type { ListObjekt } from "@repo/lib/types/objekt";
import { useCallback, useState } from "react";

/** the Set Price and Remove dialogs, each opened on the entries it acts on */
export function useEntryDialogs() {
  const [priceTarget, setPriceTarget] = useState<ListObjekt[]>([]);
  const [removeTarget, setRemoveTarget] = useState<ListObjekt[]>([]);
  const [priceOpen, setPriceOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const openPrice = useCallback((objekts: ListObjekt[]) => {
    setPriceTarget(objekts);
    setPriceOpen(true);
  }, []);

  const openRemove = useCallback((objekts: ListObjekt[]) => {
    setRemoveTarget(objekts);
    setRemoveOpen(true);
  }, []);

  return {
    openPrice,
    openRemove,
    price: { open: priceOpen, onOpenChange: setPriceOpen, objekts: priceTarget },
    remove: { open: removeOpen, onOpenChange: setRemoveOpen, objekts: removeTarget },
  };
}
