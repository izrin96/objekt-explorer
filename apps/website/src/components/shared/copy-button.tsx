import { CopyIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import { Button } from "@/components/intentui/button";
import { m } from "@/paraglide/messages";

export function CopyButton({ text }: { text: string }) {
  const [, copy] = useCopyToClipboard();
  return (
    <Button
      intent="outline"
      onPress={() => {
        toast.success(m.common_copy_copied());
        return copy(text);
      }}
      size="xs"
      className="flex items-center gap-1.5"
    >
      <CopyIcon />
      {m.common_copy_button()}
    </Button>
  );
}
