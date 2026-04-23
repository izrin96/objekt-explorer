"use client";

import { useIntlayer } from "next-intlayer";
import { useState } from "react";

import { Button } from "@/components/intentui/button";
import { ExportListModal } from "@/components/list/modal/export-list-modal";
import type { PublicList } from "@/lib/universal/user";

export function ExportButton({ list }: { list: PublicList }) {
  const content = useIntlayer("common");
  const [open, setOpen] = useState(false);

  return (
    <>
      <ExportListModal open={open} setOpen={setOpen} list={list} />
      <Button intent="outline" onPress={() => setOpen(true)}>
        {content.actions.export.value}
      </Button>
    </>
  );
}
