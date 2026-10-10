import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { notification, report, userSanction } from "@repo/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { sanctionEnd } from "../lib/sanctions";
import { disconnectUser, publishNotify } from "../realtime";
import {
  type ActInput,
  isStaffRole,
  type RevokeInput,
  roleList,
  type SetRoleInput,
} from "../schemas/moderation";
import type { SanctionPayload } from "../schemas/notification";
import {
  audit,
  changeRole,
  findAccount,
  openReportsOf,
  refuseModeration,
  sanctionColumns,
  syncBan,
} from "./moderation";
import { cancelOpenOffers, offersOf, publishCancelled } from "./offer/cancel";
import { activeSanctionWhere } from "./safety";
import { bumpSafetyVersions } from "./safety-cache";

export async function applyModAction(me: string, isAdmin: boolean, input: ActInput) {
  if (input.userId === me) refuseModeration("self");
  const target = await findAccount(input.userId);
  if (isStaffRole(target.role) && !isAdmin) refuseModeration("staff_target");

  const now = new Date();
  const end = sanctionEnd(input.action, input.days, now);

  const result = await db.transaction(async (tx) => {
    const sanctionId =
      input.action === "dismiss"
        ? null
        : (
            await tx
              .insert(userSanction)
              .values({
                userId: input.userId,
                type: input.action,
                reason: input.reason,
                expiresAt: end?.toISOString() ?? null,
                issuedBy: me,
              })
              .returning({ id: userSanction.id })
          )[0]!.id;
    if (input.action === "ban") await syncBan(tx, input.userId, { revokeSessions: true });

    const resolved = await tx
      .update(report)
      .set({
        status: input.action === "dismiss" ? "dismissed" : "actioned",
        resolvedBy: me,
        resolvedAt: sql`now()`,
      })
      .where(openReportsOf(input.userId))
      .returning({ id: report.id });

    await audit(tx, {
      actorId: me,
      action: input.action,
      targetUserId: input.userId,
      reportIds: resolved.map((r) => r.id),
      detail: { reason: input.reason, days: input.days ?? null, sanctionId },
    });

    if (
      sanctionId !== null &&
      (input.action === "warn" || input.action === "chat_mute" || input.action === "trade_block")
    ) {
      await tx.insert(notification).values({
        userId: input.userId,
        type: "sanction",
        payload: {
          action: input.action,
          reason: input.reason,
          endsAt: end?.toISOString() ?? null,
        } satisfies SanctionPayload,
        // its own group, so a notice is never merged with another
        groupKey: `sanction:${sanctionId}`,
      });
    }
    const cancelled =
      input.action === "trade_block" || input.action === "ban"
        ? await cancelOpenOffers(tx, offersOf(input.userId), "sanction")
        : null;
    return { sanctionId, resolvedReports: resolved.length, cancelled };
  });

  if (input.action === "trade_block" || input.action === "ban") {
    await bumpSafetyVersions([input.userId]);
  }
  if (input.action === "ban") await disconnectUser(input.userId);
  else if (input.action !== "dismiss") await publishNotify(input.userId);
  if (result.cancelled) await publishCancelled(result.cancelled);
  return { sanctionId: result.sanctionId, resolvedReports: result.resolvedReports };
}

export async function revokeSanction(me: string, isAdmin: boolean, input: RevokeInput) {
  const [sanction] = await db
    .select({ ...sanctionColumns, userId: userSanction.userId })
    .from(userSanction)
    .where(and(eq(userSanction.id, input.sanctionId), activeSanctionWhere));
  if (!sanction) refuseModeration("not_active");
  const target = await findAccount(sanction.userId);
  if (isStaffRole(target.role) && !isAdmin) refuseModeration("staff_target");

  await db.transaction(async (tx) => {
    await tx
      .update(userSanction)
      .set({ revokedAt: sql`now()`, revokedBy: me })
      .where(eq(userSanction.id, sanction.id));
    if (sanction.type === "ban") await syncBan(tx, sanction.userId, { revokeSessions: false });
    await audit(tx, {
      actorId: me,
      action: "revoke",
      targetUserId: sanction.userId,
      detail: { reason: input.reason, sanctionId: sanction.id, type: sanction.type },
    });
  });

  if (sanction.type === "trade_block" || sanction.type === "ban") {
    await bumpSafetyVersions([sanction.userId]);
  }
  // an open tab drops the mute notice, or shows its trade lists again
  await publishNotify(sanction.userId);
}

export async function setUserRole(me: string, isAdmin: boolean, input: SetRoleInput) {
  if (!isAdmin) throw new ORPCError("FORBIDDEN");
  if (input.userId === me) refuseModeration("self");
  const target = await findAccount(input.userId);
  if (roleList(target.role).includes("admin")) refuseModeration("staff_target");

  await db.transaction((tx) =>
    changeRole(tx, {
      actorId: me,
      userId: input.userId,
      role: input.role,
      previous: target.role ?? "user",
    }),
  );
}
