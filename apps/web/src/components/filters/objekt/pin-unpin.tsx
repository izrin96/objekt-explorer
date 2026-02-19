"use client";

import { PushPinIcon, PushPinSlashIcon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";

import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { useBatchPin } from "@/hooks/actions/batch-pin";
import { useBatchUnpin } from "@/hooks/actions/batch-unpin";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { useTarget } from "@/hooks/use-target";
import { isObjektOwned } from "@/lib/objekt-utils";

export function PinObjekt({ size }: { size?: ButtonProps["size"] }) {
  const t = useTranslations("objekt_menu");
  const target = useTarget((a) => a.profile)!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const handleAction = useObjektSelect((a) => a.handleAction);
  const batchPin = useBatchPin();
  return (
    <Button
      size={size}
      intent="outline"
      onPress={() =>
        handleAction(() => {
          batchPin.mutate({
            address: target.address,
            tokenIds: selected
              .filter(isObjektOwned)
              .map((a) => Number(a.id))
              .filter(Boolean),
          });
        })
      }
    >
      <PushPinIcon data-slot="icon" />
      {t("pin")}
    </Button>
  );
}

export function UnpinObjekt({ size }: { size?: ButtonProps["size"] }) {
  const t = useTranslations("objekt_menu");
  const target = useTarget((a) => a.profile)!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const handleAction = useObjektSelect((a) => a.handleAction);
  const batchUnpin = useBatchUnpin();
  return (
    <Button
      size={size}
      intent="outline"
      onPress={() => {
        handleAction(() => {
          batchUnpin.mutate({
            address: target.address,
            tokenIds: selected
              .filter(isObjektOwned)
              .map((a) => Number(a.id))
              .filter(Boolean),
          });
        });
      }}
    >
      <PushPinSlashIcon data-slot="icon" />
      {t("unpin")}
    </Button>
  );
}
