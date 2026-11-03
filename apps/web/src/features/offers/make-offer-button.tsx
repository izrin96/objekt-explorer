import { HandshakeIcon } from "@phosphor-icons/react";
import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useStartGate } from "@/features/user/start-gate";
import { m } from "@/paraglide/messages";

import { offerLink, type OfferStart } from "./offer-link";
import { forgetOpener, rememberOpener, takeReturn } from "./return-focus";

type MakeOfferProps = {
  /** where the offer starts; `from` is this page */
  start: Omit<OfferStart, "from">;
  label?: string;
  variant?: ButtonProps["variant"];
  className?: string;
};

/**
 * A link to the offer page. The caller shows it only where Message shows (`messageable`, and
 * never on the viewer's own); a first offer opens the conversation when it is sent. Back or
 * Cancel on the page brings focus back to the link that opened it.
 */
export function MakeOfferButton({
  start,
  label = m.offer_make(),
  variant = "outline",
  className,
}: MakeOfferProps) {
  const { gate } = useStartGate();
  const from = useLocation({ select: (location) => location.href });
  const ref = useRef<HTMLAnchorElement>(null);
  const opener = `offer:${JSON.stringify(start)}`;
  useEffect(() => {
    // a feed row mounts again after Back; scroll restoration already placed it
    if (takeReturn(opener)) ref.current?.focus({ preventScroll: true });
  }, [opener]);

  return (
    <Button
      variant={variant}
      size="sm"
      className={className}
      render={
        <Link
          ref={ref}
          {...offerLink({ ...start, from })}
          // each preload reads the person and their matches, against the feed's rate limit
          preload={false}
          onClick={(event) => {
            // signed out, or with no Cosmo linked: the gate says so instead
            if (!gate()) event.preventDefault();
            else rememberOpener(opener);
          }}
        />
      }
    >
      <HandshakeIcon />
      <span>{label}</span>
    </Button>
  );
}

/**
 * Opens the offer page from a menu item or a drawer, where a link can't be; `from` is this page
 * unless set. `opener` names the control that takes focus again on Back, when there is one.
 */
export function useOpenOffer() {
  const { gate } = useStartGate();
  const navigate = useNavigate();
  const router = useRouter();
  return (start: OfferStart, opener?: string) => {
    if (!gate()) return;
    if (opener) rememberOpener(opener);
    else forgetOpener();
    void navigate(offerLink({ ...start, from: start.from ?? router.state.location.href }));
  };
}
