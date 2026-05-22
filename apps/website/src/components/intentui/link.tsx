import { createLink } from "@tanstack/react-router";
import {
  Link as LinkPrimitive,
  type LinkProps as LinkPrimitiveProps,
} from "react-aria-components/Link";

import { cx } from "@/lib/primitive";

export interface LinkProps extends LinkPrimitiveProps {
  ref?: React.RefObject<HTMLAnchorElement>;
}

export function InternalLink({ className, ref, ...props }: LinkProps) {
  return (
    <LinkPrimitive
      ref={ref}
      className={cx(
        "font-medium text-(--text)",
        "outline-0 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring forced-colors:outline-[Highlight]",
        "disabled:cursor-default disabled:opacity-50 forced-colors:disabled:text-[GrayText]",
        // custom "to" in props
        ("to" in props || "href" in props) && "cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

// Internal navigation via TanStack Router (uses `to` prop)
const Link = createLink(InternalLink);

// External navigation via raw `href` (does NOT go through TanStack Router)
// Defaults to opening in a new tab since external links should rarely navigate away
export interface ExternalLinkProps extends LinkPrimitiveProps {
  ref?: React.RefObject<HTMLAnchorElement>;
}
function ExternalLink({
  target = "_blank",
  rel = "noopener noreferrer",
  ...props
}: ExternalLinkProps) {
  return <InternalLink target={target} rel={rel} {...props} />;
}

export { Link, ExternalLink };
