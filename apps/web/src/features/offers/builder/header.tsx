import { useEffect, useRef } from "react";

import { m } from "@/paraglide/messages";

import type { OfferRequest } from "./types";

/** The page's title, which takes focus when the page opens: no field should take it first. */
export function BuilderHeader({ request }: { request: OfferRequest }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div>
      <h1
        ref={titleRef}
        tabIndex={-1}
        className="font-display text-xl font-semibold tracking-tight text-balance wrap-anywhere outline-none"
      >
        {request.counter
          ? m.offer_builder_counter_title({ name: request.name })
          : m.offer_builder_title({ name: request.name })}
      </h1>
      <p className="text-muted-foreground mt-0.5 text-sm text-pretty">
        {m.offer_builder_description()}
      </p>
    </div>
  );
}
