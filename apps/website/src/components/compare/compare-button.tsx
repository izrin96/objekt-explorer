import { useState } from "react";

import { CompareModal } from "@/components/compare/modal/compare-modal";
import { Button } from "@/components/intentui/button";
import { m } from "@/paraglide/messages";

type SourceList = {
  id: string;
  name: string;
};

export function CompareButton({ sourceList }: { sourceList: SourceList }) {
  const [compareOpen, setCompareOpen] = useState(false);

  return (
    <>
      <CompareModal open={compareOpen} setOpen={setCompareOpen} sourceList={sourceList} />
      <Button intent="outline" onPress={() => setCompareOpen(true)}>
        {m.common_actions_compare()}
      </Button>
    </>
  );
}
