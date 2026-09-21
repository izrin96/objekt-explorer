import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { CompareDialog } from "./compare-dialog";

export function CompareButton({
  sourceName,
  sourceId,
  size = "sm",
}: {
  sourceName: string;
  sourceId: string;
  size?: ButtonProps["size"];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size={size} onClick={() => setOpen(true)}>
        <MagnifyingGlassIcon />
        {m.common_actions_compare()}
      </Button>
      <CompareDialog
        sourceName={sourceName}
        sourceId={sourceId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
