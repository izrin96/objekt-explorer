import { Fragment, type ReactNode } from "react";

import type { m } from "@/paraglide/messages";

type MessagePart = ReturnType<typeof m.profile_edit_unlink_note.parts>[number];

/**
 * Renders a Paraglide message that carries markup (`{#link}…{/link}`,
 * `{#nickname/}`) as elements. Calling such a message directly drops a
 * standalone markup entirely, so its `parts` are the only faithful source.
 *
 * Single level only, which is what every message here uses.
 */
export function MessageMarkup({
  parts,
  markup,
}: {
  parts: MessagePart[];
  markup: Record<string, (children: ReactNode) => ReactNode>;
}) {
  const out: ReactNode[] = [];
  let openName: string | null = null;
  let openChildren: ReactNode[] = [];

  for (const [index, part] of parts.entries()) {
    const sink = openName === null ? out : openChildren;
    if (part.type === "text") {
      sink.push(part.value);
    } else if (part.type === "markup-standalone") {
      sink.push(<Fragment key={index}>{markup[part.name]?.(null)}</Fragment>);
    } else if (part.type === "markup-start") {
      openName = part.name;
      openChildren = [];
    } else if (part.type === "markup-end" && openName !== null) {
      out.push(<Fragment key={index}>{markup[openName]?.(openChildren)}</Fragment>);
      openName = null;
      openChildren = [];
    }
  }

  return <>{out}</>;
}

/** The `{#b}` of a count message: the number stands out of muted text. */
export const countMarkup = {
  b: (children: ReactNode) => <b className="text-foreground font-semibold">{children}</b>,
};

/** A message with markup in its slots; private-use stand-ins keep each locale's word order. */
export function rich<K extends string>(
  format: (params: Record<K, string>) => string,
  nodes: Record<K, ReactNode>,
) {
  const keys = Object.keys(nodes) as K[];
  const params = Object.fromEntries(
    keys.map((key, i) => [key, String.fromCharCode(0xe000 + i)]),
  ) as Record<K, string>;
  return format(params)
    .split(/([-])/)
    .map((part, i) => {
      const key = keys[part.length === 1 ? part.charCodeAt(0) - 0xe000 : -1];
      return <Fragment key={i}>{key === undefined ? part : nodes[key]}</Fragment>;
    });
}
