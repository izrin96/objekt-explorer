import type { ListObjekt } from "@repo/lib/types/objekt";
import { useCallback, useState } from "react";

/** the Set Price, Set ratio and Remove dialogs, each opened on the entries it acts on */
export function useEntryDialogs() {
  const [priceTarget, setPriceTarget] = useState<ListObjekt[]>([]);
  const [ratioTarget, setRatioTarget] = useState<ListObjekt[]>([]);
  const [removeTarget, setRemoveTarget] = useState<ListObjekt[]>([]);
  const [priceOpen, setPriceOpen] = useState(false);
  const [ratioOpen, setRatioOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const openPrice = useCallback((objekts: ListObjekt[]) => {
    setPriceTarget(objekts);
    setPriceOpen(true);
  }, []);

  const openRatio = useCallback((objekts: ListObjekt[]) => {
    setRatioTarget(objekts);
    setRatioOpen(true);
  }, []);

  const openRemove = useCallback((objekts: ListObjekt[]) => {
    setRemoveTarget(objekts);
    setRemoveOpen(true);
  }, []);

  return {
    openPrice,
    openRatio,
    openRemove,
    price: { open: priceOpen, onOpenChange: setPriceOpen, objekts: priceTarget },
    ratio: { open: ratioOpen, onOpenChange: setRatioOpen, objekts: ratioTarget },
    remove: { open: removeOpen, onOpenChange: setRemoveOpen, objekts: removeTarget },
  };
}
