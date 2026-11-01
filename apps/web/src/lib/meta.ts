import { siteOrigin } from "./site-origin";
import { SITE_NAME } from "./utils";

type Meta = Record<string, string>;

export function pageTitle(title?: string): string {
  return title === undefined ? SITE_NAME : `${title} · ${SITE_NAME}`;
}

/**
 * A route's `head` tags: its title and, for a shareable page, its social preview. `url`, a path on
 * this site, adds the description, `og:title`, `og:url` and the canonical link, all absolute.
 */
export function generateMetadata({
  title,
  url,
  openGraph,
  twitter,
}: {
  title?: string;
  url?: string;
  openGraph?: { description: string; images?: { url: string }[] };
  twitter?: {
    card: "summary" | "summary_large_image";
    title: string;
    description: string;
    images?: string[];
  };
}): { meta: Meta[]; links: Meta[] } {
  const meta: Meta[] = [{ title: pageTitle(title) }];
  const links: Meta[] = [];

  if (url !== undefined) {
    const href = new URL(url, siteOrigin()).toString();
    meta.push({ property: "og:url", content: href });
    if (title !== undefined) meta.push({ property: "og:title", content: title });
    if (openGraph) meta.push({ name: "description", content: openGraph.description });
    links.push({ rel: "canonical", href });
  }

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

  return { meta, links };
}
