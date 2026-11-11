import { Fragment, type ReactNode } from "react";

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
