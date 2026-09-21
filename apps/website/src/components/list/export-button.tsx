import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import type { PublicList } from "@repo/api/schemas/list";
import { useState } from "react";

import { Button } from "@/components/intentui/button";
import { ExportListModal } from "@/components/list/modal/export-list-modal";
import { m } from "@/paraglide/messages";

export function ExportButton({ list }: { list: PublicList }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ExportListModal open={open} setOpen={setOpen} list={list} />
      <Button intent="outline" onPress={() => setOpen(true)}>
        <ArrowUpTrayIcon />
        {m.common_actions_export()}
      </Button>
    </>
  );
}
