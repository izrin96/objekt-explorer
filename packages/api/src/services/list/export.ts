import type * as z from "zod";

import { listCsv } from "../../lib/list-csv";
import type { listEntriesInputSchema } from "../../schemas/list";
import { buildListEntries } from "./entry-view";
import { fetchListWithEntries } from "./read";
import { fetchRuleDefs } from "./rules";

/** A list's entries as CSV, narrowed to `artists` when given; null for no such list. */
export async function exportListCsv(
  slug: string,
  artists: z.infer<typeof listEntriesInputSchema>["artist"],
) {
  const list = await fetchListWithEntries(slug);
  if (!list) return null;
  const [entries, rules] = await Promise.all([
    buildListEntries(list.entries, list.isProfileBind, { artists, hideSerial: list.hideSerial }),
    fetchRuleDefs([list.id]),
  ]);
  return { slug: list.slug, csv: listCsv(entries, rules.get(list.id) ?? [], list.ratio) };
}
