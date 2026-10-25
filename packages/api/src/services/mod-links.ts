import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { addressLinkEvent, userAddress } from "@repo/db/schema";
import { desc, eq, type SQL, sql } from "drizzle-orm";

import { moveRefusal } from "../lib/link-rules";
import { iso } from "../lib/time";
import type {
  AddressHistoryInput,
  MoveAddressInput,
  UnlinkAddressInput,
} from "../schemas/moderation";
import { fetchPartners } from "./chat";
import {
  inOpenTrade,
  lockAddresses,
  lockUsersShared,
  recordLinkEvents,
  sanctionedAmong,
} from "./cosmo-link";
import { audit, findAccount, refuseModeration } from "./moderation";

const HISTORY_LIMIT = 200;

/** The link events a filter picks, newest first, each with its account and staff member named. */
export async function linkEventsWhere(where: SQL) {
  const events = await db
    .select({
      id: addressLinkEvent.id,
      address: addressLinkEvent.address,
      userId: addressLinkEvent.userId,
      event: addressLinkEvent.event,
      reason: addressLinkEvent.reason,
      actorId: addressLinkEvent.actorId,
      createdAt: addressLinkEvent.createdAt,
    })
    .from(addressLinkEvent)
    .where(where)
    .orderBy(desc(addressLinkEvent.createdAt), desc(addressLinkEvent.id))
    .limit(HISTORY_LIMIT);
  const people = await fetchPartners(
    events.flatMap((e) => (e.actorId ? [e.userId, e.actorId] : [e.userId])),
  );
  const nameOf = (id: string) => people.get(id) ?? { userId: id, user: null, identity: null };
  return events.map((e) => ({
    id: e.id,
    address: e.address.toLowerCase(),
    account: nameOf(e.userId),
    event: e.event,
    reason: e.reason,
    actor: e.actorId ? nameOf(e.actorId) : null,
    at: iso(e.createdAt)!,
  }));
}

export async function addressHistory(input: AddressHistoryInput) {
  const [events, [current]] = await Promise.all([
    linkEventsWhere(eq(addressLinkEvent.address, input.address)),
    db
      .select({ userId: userAddress.userId })
      .from(userAddress)
      .where(eq(userAddress.address, input.address)),
  ]);
  const holderId = current?.userId ?? null;
  const holder = holderId ? ((await fetchPartners([holderId])).get(holderId) ?? null) : null;
  return { events, holder };
}

/** A staff move, or a staff unlink when `toUserId` is absent: both take one lock order and one set of refusals. */
async function relink(
  me: string,
  isAdmin: boolean,
  change: { address: string; fromUserId: string; toUserId?: string; reason: string },
) {
  if (!isAdmin) throw new ORPCError("FORBIDDEN");
  const { address, fromUserId, toUserId, reason } = change;
  await findAccount(fromUserId);
  if (toUserId !== undefined) await findAccount(toUserId);

  await db.transaction(async (tx) => {
    const ids = toUserId === undefined ? [fromUserId] : [fromUserId, toUserId];
    const locked = await lockUsersShared(tx, ids);
    // a scrubbed account takes no address: it holds nothing, and the link would outlive it
    if (toUserId !== undefined && locked.some((row) => row.id === toUserId && row.deleted_at)) {
      refuseModeration("deleted_target");
    }
    await lockAddresses(tx, [address]);
    const [current] = await tx
      .select({ address: userAddress.address, userId: userAddress.userId })
      .from(userAddress)
      .where(eq(userAddress.address, address));
    const refusal = moveRefusal({
      fromId: fromUserId,
      ...(toUserId === undefined ? {} : { toId: toUserId }),
      holderNow: current?.userId ?? null,
      sanctionedEither: (await sanctionedAmong(tx, ids)).size > 0,
      inOpenTrade: await inOpenTrade(tx, address),
    });
    if (refusal) refuseModeration(refusal);

    await tx
      .update(userAddress)
      .set(
        toUserId === undefined
          ? { userId: null, isDefault: false }
          : { userId: toUserId, linkedAt: sql`now()`, isDefault: false },
      )
      .where(eq(userAddress.address, address));
    const reasonCode = toUserId === undefined ? ("staff_unlink" as const) : ("staff_move" as const);
    await recordLinkEvents(tx, [
      { address, userId: fromUserId, event: "unlinked", reason: reasonCode, actorId: me },
      ...(toUserId === undefined
        ? []
        : [
            {
              address,
              userId: toUserId,
              event: "linked" as const,
              reason: reasonCode,
              actorId: me,
            },
          ]),
    ]);
    const detail = {
      address: address.toLowerCase(),
      fromUserId,
      toUserId: toUserId ?? null,
      reason,
    };
    await audit(tx, {
      actorId: me,
      action: toUserId === undefined ? "address_unlink" : "address_move",
      targetUserId: fromUserId,
      detail,
    });
    if (toUserId !== undefined) {
      await audit(tx, { actorId: me, action: "address_move", targetUserId: toUserId, detail });
    }
  });
}

export const moveAddress = (me: string, isAdmin: boolean, input: MoveAddressInput) =>
  relink(me, isAdmin, input);

export const unlinkAddress = (me: string, isAdmin: boolean, input: UnlinkAddressInput) =>
  relink(me, isAdmin, {
    address: input.address,
    fromUserId: input.userId,
    reason: input.reason,
  });
