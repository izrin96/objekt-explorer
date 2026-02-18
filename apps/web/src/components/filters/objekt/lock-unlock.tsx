"use client";

import { LockSimpleIcon, LockSimpleOpenIcon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";

import type { ButtonProps } from "@/components/ui/button";

import { Button } from "@/components/ui/button";
import { useBatchLock } from "@/hooks/actions/batch-lock";
import { useBatchUnlock } from "@/hooks/actions/batch-unlock";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { useTarget } from "@/hooks/use-target";
import { isObjektOwned } from "@/lib/objekt-utils";

export function LockObjekt({ size }: { size?: ButtonProps["size"] }) {
  const t = useTranslations("objekt_menu");
  const target = useTarget((a) => a.profile)!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const handleAction = useObjektSelect((a) => a.handleAction);
  const batchLock = useBatchLock();
  return (
    <Button
      size={size}
      intent="outline"
      onPress={() =>
        handleAction(() => {
          batchLock.mutate({
            address: target.address,
            tokenIds: selected
              .filter(isObjektOwned)
              .map((a) => Number(a.id))
              .filter(Boolean),
          });
        })
      }
    >
      <LockSimpleIcon data-slot="icon" />
      {t("lock")}
    </Button>
  );
}

export function UnlockObjekt({ size }: { size?: ButtonProps["size"] }) {
  const t = useTranslations("objekt_menu");
  const target = useTarget((a) => a.profile)!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const handleAction = useObjektSelect((a) => a.handleAction);
  const batchUnlock = useBatchUnlock();
  return (
    <Button
      size={size}
      intent="outline"
      onPress={() => {
        handleAction(() => {
          batchUnlock.mutate({
            address: target.address,
            tokenIds: selected
              .filter(isObjektOwned)
              .map((a) => Number(a.id))
              .filter(Boolean),
          });
        });
      }}
    >
      <LockSimpleOpenIcon data-slot="icon" />
      {t("unlock")}
    </Button>
  );
}
