import { CopyIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";

import { Button } from "./ui/button";

export function CopyButton({ text }: { text: string }) {
  const [, copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  return (
    <Button
      intent="outline"
      onPress={() => {
        setCopied(true);
        return copy(text).then(() => {
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      size="xs"
      className="flex items-center gap-1.5"
    >
      <CopyIcon data-slot="icon" />
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}
