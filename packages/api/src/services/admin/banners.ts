import { db } from "@repo/db";
import { notification, user, userAddress } from "@repo/db/schema";
import { and, eq, isNotNull, isNull, lt, or, sql } from "drizzle-orm";

import { ownBannerKey } from "../../lib/banner-key";
import { refuse } from "../../lib/refuse";
import { iso } from "../../lib/time";
import { publishNotify } from "../../realtime";
import { BANNER_PAGE_SIZE, type BannerCursor, type RemoveBannerInput } from "../../schemas/admin";
import { staffTargetRefused } from "../../schemas/moderation";
import type { SanctionPayload } from "../../schemas/notification";
import { fetchPartners } from "../chat";
import { audit } from "../moderation/core";
import { deleteFileFromBucket, S3_BUCKET, S3_PUBLIC_URL } from "../s3";

// the text Postgres wrote, so a cursor keeps every microsecond of it
const updatedAtText = sql<string | null>`${userAddress.bannerUpdatedAt}::text`;

function afterCursor(cursor: BannerCursor | undefined) {
  if (!cursor) return undefined;
  if (cursor.at === null) {
    return and(isNull(userAddress.bannerUpdatedAt), lt(userAddress.id, cursor.id));
  }
  return or(
    sql`${userAddress.bannerUpdatedAt} < ${cursor.at}::timestamptz`,
    and(
      sql`${userAddress.bannerUpdatedAt} = ${cursor.at}::timestamptz`,
      lt(userAddress.id, cursor.id),
    ),
    isNull(userAddress.bannerUpdatedAt),
  );
}

/**
 * Every profile's current banner, newest change first; banners from before their time was
 * recorded come last. Each names the account holding the profile, by its default profile.
 */
export async function bannerFeed(isAdmin: boolean, cursor: BannerCursor | undefined) {
  const rows = await db
    .select({
      id: userAddress.id,
      address: userAddress.address,
      nickname: userAddress.nickname,
      bannerImgUrl: userAddress.bannerImgUrl,
      bannerImgType: userAddress.bannerImgType,
      updatedAt: updatedAtText,
      userId: userAddress.userId,
      role: user.role,
      deletedAt: user.deletedAt,
    })
    .from(userAddress)
    .leftJoin(user, eq(user.id, userAddress.userId))
    .where(and(isNotNull(userAddress.bannerImgUrl), afterCursor(cursor)))
    // matches `user_address_banner_feed_idx`, nulls included
    .orderBy(
      sql`${userAddress.bannerUpdatedAt} DESC NULLS LAST`,
      sql`${userAddress.id} DESC NULLS LAST`,
    )
    .limit(BANNER_PAGE_SIZE + 1);

  const page = rows.slice(0, BANNER_PAGE_SIZE);
  const holders = await fetchPartners([
    ...new Set(page.flatMap((row) => (row.userId && !row.deletedAt ? [row.userId] : []))),
  ]);
  const last = page.at(-1);

  return {
    banners: page.map((row) => {
      const holder = row.userId && !row.deletedAt ? (holders.get(row.userId) ?? null) : null;
      return {
        id: row.id,
        address: row.address.toLowerCase(),
        nickname: row.nickname,
        bannerImgUrl: row.bannerImgUrl!,
        bannerImgType: row.bannerImgType,
        updatedAt: iso(row.updatedAt),
        holder,
        canRemove: !staffTargetRefused(holder ? row.role : null, isAdmin, "dismiss"),
      };
    }),
    nextCursor:
      rows.length > BANNER_PAGE_SIZE && last
        ? ({ at: last.updatedAt, id: last.id } satisfies BannerCursor)
        : undefined,
  };
}

/**
 * Takes a profile's banner down: clears it, writes the audit entry on the holding account and
 * tells that account why, then deletes the file. Not a sanction: no report is resolved.
 */
export async function removeBanner(me: string, isAdmin: boolean, input: RemoveBannerInput) {
  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: userAddress.id,
        address: userAddress.address,
        nickname: userAddress.nickname,
        bannerImgUrl: userAddress.bannerImgUrl,
        bannerImgType: userAddress.bannerImgType,
        userId: userAddress.userId,
      })
      .from(userAddress)
      .where(eq(userAddress.address, input.address))
      .for("update");
    // compare-and-set: the banner the moderator saw, or nothing changes
    if (!row || row.bannerImgUrl !== input.bannerImgUrl) {
      refuse("CONFLICT", "admin_banner_changed", "The banner changed after the feed loaded");
    }

    const [holder] = row.userId
      ? await tx
          .select({ role: user.role, deletedAt: user.deletedAt })
          .from(user)
          .where(eq(user.id, row.userId))
      : [];
    if (holder && staffTargetRefused(holder.role, isAdmin, "dismiss")) {
      refuse("FORBIDDEN", "admin_staff_target", "Only an admin can remove a staff banner");
    }

    await tx
      .update(userAddress)
      .set({ bannerImgUrl: null, bannerImgType: null, bannerUpdatedAt: sql`now()` })
      .where(eq(userAddress.id, row.id));

    const address = row.address.toLowerCase();
    const auditId = await audit(tx, {
      actorId: me,
      action: "banner_remove",
      targetUserId: row.userId,
      detail: {
        address,
        nickname: row.nickname,
        bannerImgUrl: row.bannerImgUrl,
        bannerImgType: row.bannerImgType,
        reason: input.reason,
      },
    });

    const notified = row.userId !== null && holder !== undefined && holder.deletedAt === null;
    if (notified) {
      await tx.insert(notification).values({
        userId: row.userId!,
        type: "sanction",
        payload: {
          action: "banner_remove",
          reason: input.reason,
          endsAt: null,
          profile: { address, nickname: row.nickname },
        } satisfies SanctionPayload,
        // one key per removal: two profiles of one account stay two unread notices
        groupKey: `banner_remove:${auditId}`,
      });
    }
    return { url: row.bannerImgUrl, address, notifyUserId: notified ? row.userId : null };
  });

  // only once the row no longer points at it, as `profile.edit` does
  const key = ownBannerKey(result.url, S3_PUBLIC_URL, result.address);
  if (key) {
    await deleteFileFromBucket(S3_BUCKET, key).catch(() => undefined);
  }
  if (result.notifyUserId) await publishNotify(result.notifyUserId);
  return { notified: result.notifyUserId !== null };
}
