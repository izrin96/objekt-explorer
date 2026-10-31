import { HandshakeIcon } from "@phosphor-icons/react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useStartGate } from "@/features/chat/message-button";
import { m } from "@/paraglide/messages";

import { type OfferRequest, useOfferBuilder, useSharedOfferBuilder } from "./offer-builder";

type MakeOfferProps = {
  request: OfferRequest;
  label?: string;
  variant?: ButtonProps["variant"];
  className?: string;
};

/**
 * Opens the offer builder. The caller shows it only where Message shows (`messageable`, and
 * never on the viewer's own); a first offer opens the conversation when it is sent. Under an
 * `OfferBuilderProvider` it opens the shared builder; elsewhere the button carries its own.
 */
export function MakeOfferButton(props: MakeOfferProps) {
  const shared = useSharedOfferBuilder();
  return shared ? <OfferButton {...props} onOpen={shared} /> : <OwnBuilderButton {...props} />;
}

function OwnBuilderButton(props: MakeOfferProps) {
  const builder = useOfferBuilder();
  return (
    <>
      <OfferButton {...props} onOpen={builder.open} />
      {builder.element}
    </>
  );
}

function OfferButton({
  request,
  label = m.offer_make(),
  variant = "outline",
  className,
  onOpen,
}: MakeOfferProps & { onOpen: (request: OfferRequest) => void }) {
  const { gate } = useStartGate();

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={() => {
        if (gate()) onOpen(request);
      }}
      className={className}
    >
      <HandshakeIcon />
      <span>{label}</span>
    </Button>
  );
}
