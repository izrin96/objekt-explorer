import { HandshakeIcon } from "@phosphor-icons/react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useStartGate } from "@/features/chat/message-button";
import { m } from "@/paraglide/messages";

import { type OfferRequest, useOfferBuilder } from "./offer-builder";

/**
 * Opens the offer builder. The caller shows it only where Message shows (`messageable`, and
 * never on the viewer's own); a first offer opens the conversation when it is sent.
 */
export function MakeOfferButton({
  request,
  label = m.offer_make(),
  iconOnly = false,
  labelClassName,
  variant = "outline",
  size,
  className,
}: {
  request: OfferRequest;
  label?: string;
  iconOnly?: boolean;
  /** e.g. `max-sm:sr-only`, where a row has no room for the word */
  labelClassName?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const { gate } = useStartGate();
  const builder = useOfferBuilder();
  const named = m.offer_make_name({ name: request.name });

  return (
    <>
      <Button
        variant={variant}
        size={size ?? (iconOnly ? "icon-sm" : "sm")}
        aria-label={iconOnly ? named : undefined}
        title={iconOnly ? named : undefined}
        onClick={() => {
          if (gate()) builder.open(request);
        }}
        className={className}
      >
        <HandshakeIcon />
        {iconOnly ? null : <span className={labelClassName}>{label}</span>}
      </Button>
      {builder.element}
    </>
  );
}
