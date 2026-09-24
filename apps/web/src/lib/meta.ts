import { SITE_NAME } from "./utils";

type Meta = Record<string, string>;

export function pageTitle(title?: string): string {
  return title === undefined ? SITE_NAME : `${title} · ${SITE_NAME}`;
}

/** A route's `head` tags: its title and, for a shareable page, its social preview. */
export function generateMetadata({
  title,
  openGraph,
  twitter,
}: {
  title?: string;
  openGraph?: { description: string; images?: { url: string }[] };
  twitter?: {
    card: "summary" | "summary_large_image";
    title: string;
    description: string;
    images?: string[];
  };
}): { meta: Meta[]; links: Meta[] } {
  const meta: Meta[] = [{ title: pageTitle(title) }];

  if (openGraph) {
    meta.push({ property: "og:description", content: openGraph.description });
    for (const image of openGraph.images ?? []) {
      meta.push({ property: "og:image", content: image.url });
    }
  }
  if (twitter) {
    meta.push(
      { name: "twitter:card", content: twitter.card },
      { name: "twitter:title", content: twitter.title },
      { name: "twitter:description", content: twitter.description },
    );
    for (const image of twitter.images ?? []) {
      meta.push({ name: "twitter:image", content: image });
    }
  }

  return { meta, links: [] };
}
