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
