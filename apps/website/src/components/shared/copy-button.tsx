import { CheckIcon, CopyIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import { Button } from "@/components/intentui/button";

interface CopyButtonProps {
  text: string;
  variant?: "icon" | "button";
  size?: "sq-xs" | "xs" | "sm" | "sq-sm";
  intent?: "plain" | "outline";
  ariaLabel?: string;
  toastMessage?: string;
  className?: string;
}

export function CopyButton({
  text,
  variant = "icon",
  size = variant === "button" ? "xs" : "sq-xs",
  intent = variant === "button" ? "outline" : "plain",
  ariaLabel,
  toastMessage,
  className,
}: CopyButtonProps) {
  const [, copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  const handlePress = async () => {
    await copy(text);
    setCopied(true);
    if (toastMessage) {
      toast.success(toastMessage);
    }
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Button
      size={size}
      intent={intent}
      onPress={handlePress}
      aria-label={ariaLabel}
      className={className}
    >
      <div className="t-icon-swap" data-state={copied ? "b" : "a"}>
        <span className="t-icon" data-icon="a">
          <CopyIcon size={variant === "icon" ? 14 : 16} />
        </span>
        <span className="t-icon" data-icon="b">
          <CheckIcon size={variant === "icon" ? 14 : 16} />
        </span>
      </div>
      {variant === "button" && "Copy"}
    </Button>
  );
}
