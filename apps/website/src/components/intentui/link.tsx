import { createLink } from "@tanstack/react-router";
import {
  Link as LinkPrimitive,
  type LinkProps as LinkPrimitiveProps,
} from "react-aria-components/Link";

import { cx } from "@/lib/primitive";

export interface LinkProps extends LinkPrimitiveProps {
  ref?: React.RefObject<HTMLAnchorElement>;
}

const InternalLink = ({ className, ref, ...props }: LinkProps) => {
  return (
    <LinkPrimitive
      ref={ref}
      className={cx(
        [
          "font-medium text-(--text)",
          "outline-0 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring forced-colors:outline-[Highlight]",
          "disabled:cursor-default disabled:opacity-50 forced-colors:disabled:text-[GrayText]",
          ("to" in props || "href" in props) && "cursor-pointer",
        ],
        className,
      )}
      {...props}
    />
  );
};

const ExternalLink = InternalLink;
const Link = createLink(InternalLink);

export { Link, ExternalLink };
