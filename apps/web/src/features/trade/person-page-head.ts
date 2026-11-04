import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

import type { SharePreview } from "./share-preview";

/**
 * A person or post page's tags. With no preview (not found, not shown to this viewer, a failed
 * read) it is the plain Trade title, never an error.
 */
export function personPageHead(data: { url: string; preview: SharePreview | null } | undefined) {
  const preview = data?.preview;
  if (!data || !preview) return generateMetadata({ title: m.page_titles_trade() });
  const { title, description } = preview;
  return generateMetadata({
    title,
    url: data.url,
    openGraph: { description },
    twitter: { card: "summary", title, description },
  });
}
