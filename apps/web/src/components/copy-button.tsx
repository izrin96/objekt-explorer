"use client";

import { CopyIcon } from "@phosphor-icons/react/dist/ssr";
import { useIntlayer } from "next-intlayer";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import { Button } from "./ui/button";

export function CopyButton({ text }: { text: string }) {
  const [, copy] = useCopyToClipboard();
  const content = useIntlayer("common");
  return (
    <Button
      intent="outline"
      onPress={() => {
        toast.success(content.copy.copied.value);
        return copy(text);
      }}
      size="xs"
      className="flex items-center gap-1.5"
    >
      <CopyIcon data-slot="icon" />
      {content.copy.button.value}
    </Button>
  );
}
