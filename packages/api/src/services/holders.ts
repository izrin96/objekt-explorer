import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { userAddress } from "@repo/db/schema";
import { Addresses } from "@repo/lib";
import { fetchUserProfiles } from "@repo/lib/server/user";
import { and, count, eq, inArray, min, notInArray } from "drizzle-orm";
import type * as z from "zod";

import type {
  HolderBucketKey,
  HolderRow,
  HoldersResult,
  holdersInputSchema,
} from "../schemas/objekt";
import { isProfileHidden } from "./privacy";
import { getCache } from "./redis";

// with the client's 60 s staleTime on top, figures stay within five minutes of ownership
const RANKING_TTL = 4 * 60;

// a tuple rather than an object: the largest collections cache ~25k of these
type RankedHolder = [address: string, copies: number, lowestSerial: number, rank: number];

type Ranking = {
  summary: HoldersResult["summary"];
  holders: RankedHolder[];
};

function bucketOf(copies: number): HolderBucketKey {
  if (copies === 1) return "1";
  if (copies <= 4) return "2-4";
  if (copies <= 9) return "5-9";
  return "10+";
}

/** Viewer-independent, so one cache entry serves every page and every viewer. */
function fetchRanking(slug: string): Promise<Ranking> {
  return getCache(`holders:${slug}`, RANKING_TTL, async () => {
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

    rows.sort((a, b) => b.copies - a.copies || (a.lowestSerial ?? 0) - (b.lowestSerial ?? 0));

    const buckets = new Map<HolderBucketKey, { holders: number; copies: number }>([
      ["1", { holders: 0, copies: 0 }],
      ["2-4", { holders: 0, copies: 0 }],
      ["5-9", { holders: 0, copies: 0 }],
      ["10+", { holders: 0, copies: 0 }],
    ]);

    let copies = 0;
    const holders: RankedHolder[] = [];
    for (const [index, row] of rows.entries()) {
      const previous = holders[index - 1];
      const rank = previous && previous[1] === row.copies ? previous[3] : index + 1;
      holders.push([row.owner.toLowerCase(), row.copies, row.lowestSerial ?? 0, rank]);

      const bucket = buckets.get(bucketOf(row.copies))!;
      bucket.holders += 1;
      bucket.copies += row.copies;
      copies += row.copies;
    }

    return {
      summary: {
        holders: holders.length,
        copies,
        buckets: Array.from(buckets, ([key, { holders, copies }]) => ({ key, holders, copies })),
      },
      holders,
    };
  });
}

async function fetchPrivacy(addresses: string[]) {
  const rows =
    addresses.length === 0
      ? []
      : await db
          .select({
            address: userAddress.address,
            nickname: userAddress.nickname,
            hideNickname: userAddress.hideNickname,
            privateProfile: userAddress.privateProfile,
            privateSerial: userAddress.privateSerial,
            userId: userAddress.userId,
          })
          .from(userAddress)
          .where(inArray(userAddress.address, addresses));

  return new Map(rows.map((row) => [row.address.toLowerCase(), row]));
}

/**
 * Privacy is applied here rather than in the cached ranking, so a settings
 * change shows on the next request instead of after the cache expires.
 */
function toRow(
  [address, copies, lowestSerial, rank]: RankedHolder,
  privacy: Awaited<ReturnType<typeof fetchPrivacy>>,
  viewerId: string | undefined,
  viewerAddresses: Set<string>,
): HolderRow {
  const owner = privacy.get(address);
  const hidden = (flag: boolean) =>
    !!owner && isProfileHidden({ privateProfile: flag, userId: owner.userId }, viewerId);

  const privateProfile = hidden(owner?.privateProfile ?? false);
  return {
    rank,
    copies,
    // a serial looked up in the Trades tab names its owner, so it would unmask a private row
    lowestSerial: privateProfile || hidden(owner?.privateSerial ?? false) ? null : lowestSerial,
    holder: privateProfile
      ? { kind: "private" }
      : {
          kind: "public",
          address,
          nickname: owner?.hideNickname ? null : (owner?.nickname ?? null),
        },
    isViewer: viewerAddresses.has(address),
  };
}

export async function fetchHolders(
  input: z.output<typeof holdersInputSchema>,
  viewerId: string | undefined,
): Promise<HoldersResult> {
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

  const privacy = await fetchPrivacy(
    Array.from(new Set([...page, ...own].map(([address]) => address))),
  );

  const end = input.offset + page.length;
  return {
    summary: ranking.summary,
    rows: page.map((holder) => toRow(holder, privacy, viewerId, viewerAddresses)),
    viewer: own.map((holder) => toRow(holder, privacy, viewerId, viewerAddresses)),
    nextOffset: end < ranking.holders.length ? end : undefined,
  };
}
