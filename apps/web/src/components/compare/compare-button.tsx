"use client";

import { useIntlayer } from "next-intlayer";
import { useState } from "react";

import { CompareModal } from "@/components/compare/modal/compare-modal";
import { Button } from "@/components/intentui/button";

type SourceList = {
  id: string;
  name: string;
};

export function CompareButton({ sourceList }: { sourceList: SourceList }) {
  const content = useIntlayer("common");
  const [compareOpen, setCompareOpen] = useState(false);

  return (
    <>
      <CompareModal open={compareOpen} setOpen={setCompareOpen} sourceList={sourceList} />
      <Button intent="outline" onPress={() => setCompareOpen(true)}>
        {content.actions.compare.value}
      </Button>
    </>
  );
}
