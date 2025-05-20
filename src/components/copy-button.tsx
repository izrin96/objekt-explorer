import React, { useState } from "react";

import { useCopyToClipboard } from "usehooks-ts";
import { Button } from "./ui";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr";

export function CopyButton({ text }: { text: string }) {
  const [, copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  return (
    <Button
      intent="secondary"
      onClick={() => {
        setCopied(true);
        copy(text).then(() => {
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      size="extra-small"
    >
      <CopyIcon data-slot="icon" />
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}
