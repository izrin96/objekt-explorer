import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { userAddress } from "@repo/db/schema";
import { Addresses, chunkMap } from "@repo/lib";
import { fetchUserProfiles } from "@repo/lib/server/user";
import { and, count, eq, min, notInArray, sql } from "drizzle-orm";
import type * as z from "zod";

import { TOKEN_CHUNK_SIZE } from "../../constants";
import { type RankedHolder, type Ranking, rankHolders } from "../../lib/holder-ranking";
import type { HolderRow, HoldersOutput, holdersInputSchema } from "../../schemas/collections";
import { getCache } from "../redis";

// with the client's 60 s staleTime on top, figures stay within fifteen minutes of ownership
const RANKING_TTL = 14 * 60;

// the Redis entry can be ~1 MB of JSON, so a short per-process memo skips parsing it on every page
const MEMO_TTL_MS = 15_000;
const MEMO_MAX = 16;
const memo = new Map<string, { expiresAt: number; ranking: Promise<Ranking> }>();

/** Viewer-independent, so one cache entry serves every page and every viewer. */
function fetchRanking(slug: string): Promise<Ranking> {
  const hit = memo.get(slug);
  if (hit && hit.expiresAt > Date.now()) return hit.ranking;

  const ranking = loadRanking(slug);
  memo.delete(slug);
  memo.set(slug, { expiresAt: Date.now() + MEMO_TTL_MS, ranking });
  if (memo.size > MEMO_MAX) memo.delete(memo.keys().next().value!);
  void ranking.catch(() => {
    if (memo.get(slug)?.ranking === ranking) memo.delete(slug);
  });
  return ranking;
}

// Nicknames ride in the ranking, so a rename shows when it next refreshes. Read per page, they
// made every page a main-database query, and a scraper walks every page about every five minutes.
function loadRanking(slug: string): Promise<Ranking> {
  return getCache(`holders:2:${slug}`, RANKING_TTL, async () => {
    const rows = await indexer
      .select({
        owner: objekts.owner,
        copies: count(),
        lowestSerial: min(objekts.serial),
      })
      .from(objekts)
      .innerJoin(collections, eq(objekts.collectionId, collections.id))
      .where(
        and(
          eq(collections.slug, slug),
          notInArray(objekts.owner, [Addresses.SPIN, Addresses.NULL]),
        ),
      )
      .groupBy(objekts.owner);

    const nicknames = await fetchNicknames(rows.map((row) => row.owner.toLowerCase()));
    return rankHolders(rows, nicknames);
  });
}

// one array parameter per chunk: the largest collections have ~25k holders
async function fetchNicknames(addresses: string[]) {
  const rows = await chunkMap(addresses, TOKEN_CHUNK_SIZE, (batch) =>
    db
      .select({ address: userAddress.address, nickname: userAddress.nickname })
      .from(userAddress)
      .where(sql`${userAddress.address} = ANY(${sql.param(batch)}::citext[])`),
  );
  return new Map(rows.map((row) => [row.address.toLowerCase(), row.nickname]));
}

function toRow(
  [address, copies, lowestSerial, rank, nickname]: RankedHolder,
  viewerAddresses: Set<string>,
): HolderRow {
  return {
    rank,
    copies,
    lowestSerial,
    holder: { kind: "public", address, nickname },
    isViewer: viewerAddresses.has(address),
  };
}

export async function fetchHolders(
  input: z.output<typeof holdersInputSchema>,
  viewerId: string | undefined,
): Promise<HoldersOutput> {
  const [ranking, profiles] = await Promise.all([
    fetchRanking(input.collectionSlug),
    viewerId ? fetchUserProfiles(viewerId) : [],
  ]);

  const viewerAddresses = new Set(profiles.map((profile) => profile.address.toLowerCase()));

  const page = ranking.holders.slice(input.offset, input.offset + input.limit);
  const own =
    input.offset === 0 && viewerAddresses.size > 0
      ? ranking.holders.filter(([address]) => viewerAddresses.has(address))
      : [];

  const end = input.offset + page.length;
  return {
    summary: ranking.summary,
    rows: page.map((holder) => toRow(holder, viewerAddresses)),
    viewer: own.map((holder) => toRow(holder, viewerAddresses)),
    nextOffset: end < ranking.holders.length ? end : undefined,
  };
}
