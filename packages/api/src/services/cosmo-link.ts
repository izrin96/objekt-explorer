import { db } from "@repo/db";
import { addressLinkEvent, userAddress, userSanction } from "@repo/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { linkRefusal, unlinkRefusal } from "../lib/link-rules";
import { refuse } from "../lib/refuse";
import type { Tx } from "./moderation";
import { activeSanctionWhere } from "./safety";

type Executor = Pick<typeof db, "select" | "selectDistinct" | "execute">;
const byValue = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

type LinkEventRow = typeof addressLinkEvent.$inferInsert;

/** Every account that ever held the address, plus the one holding it now. */
export async function holdersOf(executor: Executor, address: string) {
  const [events, current] = await Promise.all([
    executor
      .selectDistinct({ userId: addressLinkEvent.userId })
      .from(addressLinkEvent)
      .where(eq(addressLinkEvent.address, address)),
    executor
      .select({ userId: userAddress.userId })
      .from(userAddress)
      .where(eq(userAddress.address, address)),
  ]);
  const ids = new Set(events.map((row) => row.userId));
  for (const row of current) if (row.userId) ids.add(row.userId);
  return [...ids].sort(byValue);
}

/** The address still owes a transfer in an in-progress trade, as its parties' links stood at accept. */
export async function inOpenTrade(executor: Executor, address: string) {
  const result = await executor.execute<{ open: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM trade_leg l JOIN trade t ON t.id = l.trade_id
      WHERE l.open AND t.status = 'in_progress'
        AND lower(${address}) = ANY(l.from_addresses || l.to_addresses)
    ) AS open
  `);
  return result.rows[0]?.open ?? false;
}

export async function recordLinkEvents(tx: Tx, rows: LinkEventRow[]) {
  if (rows.length > 0) await tx.insert(addressLinkEvent).values(rows);
}

/** Step 1 of the lock order: `"user"` rows by id, `FOR SHARE` to read sanctions. */
export async function lockUsersShared(tx: Tx, ids: string[]) {
  const sorted = [...new Set(ids)].sort(byValue);
  if (sorted.length === 0) return;
  await tx.execute(
    sql`SELECT 1 FROM "user" WHERE id IN (${sql.join(sorted, sql`, `)}) ORDER BY id FOR SHARE`,
  );
}

/** Step 2 of the lock order: one advisory lock per address, in address order. */
export async function lockAddresses(tx: Tx, addresses: string[]) {
  const sorted = [...new Set(addresses.map((address) => address.toLowerCase()))].sort(byValue);
  for (const address of sorted) {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${address}))`);
  }
}

/** The accounts among `ids` with an active trade block or ban, each with its type (a ban wins). */
export async function sanctionedAmong(executor: Pick<typeof db, "selectDistinct">, ids: string[]) {
  const sanctioned = new Map<string, "trade_block" | "ban">();
  if (ids.length === 0) return sanctioned;
  const rows = await executor
    .selectDistinct({ userId: userSanction.userId, type: userSanction.type })
    .from(userSanction)
    .where(
      and(
        inArray(userSanction.userId, ids),
        inArray(userSanction.type, ["trade_block", "ban"]),
        activeSanctionWhere,
      ),
    );
  for (const row of rows) {
    if (row.type === "ban" || !sanctioned.has(row.userId)) {
      sanctioned.set(row.userId, row.type as "trade_block" | "ban");
    }
  }
  return sanctioned;
}

async function lastLeave(tx: Tx, address: string) {
  const [event] = await tx
    .select({
      userId: addressLinkEvent.userId,
      event: addressLinkEvent.event,
      reason: addressLinkEvent.reason,
      at: addressLinkEvent.createdAt,
    })
    .from(addressLinkEvent)
    .where(eq(addressLinkEvent.address, address))
    .orderBy(desc(addressLinkEvent.createdAt), desc(addressLinkEvent.id))
    .limit(1);
  if (!event || event.event !== "unlinked") return null;
  if (
    event.reason !== "user" &&
    event.reason !== "staff_unlink" &&
    event.reason !== "account_deleted"
  ) {
    return null;
  }
  return { userId: event.userId, at: new Date(event.at) };
}

const RETRY = Symbol("retry");

function alreadyLinkedOther(): never {
  return refuse(
    "BAD_REQUEST",
    "cosmo_link_already_linked_other",
    "This Cosmo ID is already linked to another account",
  );
}

type VerifiedLink = { address: string; nickname: string; cosmoId: number };

async function tryLink(userId: string, data: VerifiedLink) {
  return db.transaction(async (tx) => {
    const seen = await holdersOf(tx, data.address);
    await lockUsersShared(tx, [userId, ...seen]);
    await lockAddresses(tx, [data.address]);
    const holders = await holdersOf(tx, data.address);
    if (holders.some((id) => !seen.includes(id))) return RETRY;

    const [current] = await tx
      .select({ userId: userAddress.userId })
      .from(userAddress)
      .where(eq(userAddress.address, data.address));
    if (current?.userId) return alreadyLinkedOther();

    const sanctioned = await sanctionedAmong(tx, holders);
    const refusal = linkRefusal({
      callerId: userId,
      holders: holders.map((id) => ({ userId: id, sanctioned: sanctioned.has(id) })),
      lastLeave: await lastLeave(tx, data.address),
      now: new Date(),
    });
    if (refusal?.reason === "cosmo_link_address_restricted") {
      return refuse(
        "BAD_REQUEST",
        refusal.reason,
        "A moderation action restricts linking this Cosmo ID",
      );
    }
    if (refusal) {
      return refuse(
        "BAD_REQUEST",
        refusal.reason,
        "This Cosmo ID can't be linked to another account yet",
        { retryAt: refusal.retryAt.toISOString() },
      );
    }

    const [linked] = await tx
      .insert(userAddress)
      .values({
        address: data.address,
        nickname: data.nickname,
        cosmoId: data.cosmoId,
        linkedAt: sql`'now'`,
        userId,
      })
      .onConflictDoUpdate({
        target: userAddress.address,
        set: {
          nickname: data.nickname,
          cosmoId: data.cosmoId,
          linkedAt: sql`'now'`,
          userId,
        },
        where: sql`${userAddress.userId} IS NULL`,
      })
      .returning({ linkedUserId: userAddress.userId });
    if (!linked || linked.linkedUserId !== userId) return alreadyLinkedOther();

    await recordLinkEvents(tx, [
      { address: data.address, userId, event: "linked", reason: "verified" },
    ]);
  });
}

/** Called after the bio proof: refuses a restricted or cooling-down address, then links and records it. */
export async function linkVerified(userId: string, data: VerifiedLink) {
  for (let attempt = 0; attempt < 2; attempt++) {
    if ((await tryLink(userId, data)) !== RETRY) return;
  }
  alreadyLinkedOther();
}

export async function unlink(userId: string, address: string) {
  await db.transaction(async (tx) => {
    await lockUsersShared(tx, [userId]);
    await lockAddresses(tx, [address]);
    const [current] = await tx
      .select({ address: userAddress.address })
      .from(userAddress)
      .where(and(eq(userAddress.userId, userId), eq(userAddress.address, address)));
    if (!current) return;

    const sanctioned = await sanctionedAmong(tx, [userId]);
    const refusal = unlinkRefusal({
      sanctioned: sanctioned.has(userId),
      inOpenTrade: await inOpenTrade(tx, current.address),
    });
    if (refusal) {
      return refuse(
        "BAD_REQUEST",
        refusal,
        refusal === "cosmo_link_unlink_sanctioned"
          ? "A moderation action restricts unlinking this Cosmo ID"
          : "This Cosmo ID is in a trade in progress",
      );
    }

    const removed = await tx
      .update(userAddress)
      .set({ userId: null })
      .where(and(eq(userAddress.userId, userId), eq(userAddress.address, address)))
      .returning({ address: userAddress.address });
    await recordLinkEvents(
      tx,
      removed.map((row) => ({
        address: row.address,
        userId,
        event: "unlinked" as const,
        reason: "user" as const,
      })),
    );
  });
}
