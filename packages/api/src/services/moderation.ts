import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { modAudit, report, session, user, userSanction } from "@repo/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { effectiveSanction } from "../lib/sanctions";
import type { Role } from "../permissions";
import type { AuditAction } from "../schemas/moderation";
import { activeSanctionWhere, notBlockedEither } from "./safety";

export const MODERATION_REFUSALS = ["self", "report_limit", "staff_target", "not_active"] as const;
export type ModerationRefusal = (typeof MODERATION_REFUSALS)[number];

export function refuseModeration(reason: ModerationRefusal, retryAt?: Date): never {
  const data = retryAt ? { reason, retryAt: retryAt.toISOString() } : { reason };
  switch (reason) {
    case "report_limit":
      throw new ORPCError("TOO_MANY_REQUESTS", { data });
    case "staff_target":
      throw new ORPCError("FORBIDDEN", { data });
    case "self":
    case "not_active":
      throw new ORPCError("BAD_REQUEST", { data });
  }
}

/**
 * Sets the admin plugin's ban columns from the user's bans in force, so one ban's end or
 * revoke never lifts or shortens another. The plugin only refuses a banned user's new
 * sessions, so a new ban deletes the existing ones; sessions live only in the `session`
 * table, as no secondary storage or cookie cache is configured.
 */
export async function syncBan(tx: Tx, userId: string, options: { revokeSessions: boolean }) {
  const bans = await tx
    .select({ reason: userSanction.reason, expiresAt: userSanction.expiresAt })
    .from(userSanction)
    .where(and(eq(userSanction.userId, userId), eq(userSanction.type, "ban"), activeSanctionWhere));
  const ban = effectiveSanction(bans);
  await tx
    .update(user)
    .set(
      ban
        ? {
            banned: true,
            banReason: ban.reason,
            banExpires: ban.until ? new Date(ban.until) : null,
          }
        : { banned: false, banReason: null, banExpires: null },
    )
    .where(eq(user.id, userId));
  if (ban && options.revokeSessions) await tx.delete(session).where(eq(session.userId, userId));
}

/** `actorId` is null when the set-role script grants it. */
export async function changeRole(
  tx: Tx,
  change: { actorId: string | null; userId: string; role: Role; previous: string; via?: "script" },
) {
  await tx.update(user).set({ role: change.role }).where(eq(user.id, change.userId));
  await audit(tx, {
    actorId: change.actorId,
    action: "set_role",
    targetUserId: change.userId,
    detail: {
      role: change.role,
      previous: change.previous,
      ...(change.via ? { via: change.via } : {}),
    },
  });
}

/** Either account has blocked the other; a Message button between them stays hidden. */
export async function isBlockedEither(a: string, b: string) {
  const result = await db.execute<{ blocked: boolean }>(
    sql`SELECT NOT ${notBlockedEither(a, b)} AS blocked`,
  );
  return result.rows[0]?.blocked ?? false;
}

export async function findAccount(userId: string) {
  const [row] = await db.select().from(user).where(eq(user.id, userId));
  if (!row) throw new ORPCError("NOT_FOUND");
  return row;
}

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function audit(
  tx: Tx,
  entry: {
    actorId: string | null;
    action: AuditAction;
    targetUserId: string;
    reportIds?: number[];
    detail: Record<string, unknown>;
  },
) {
  await tx.insert(modAudit).values({ ...entry, reportIds: entry.reportIds ?? null });
}

export const openReportsOf = (userId: string) =>
  and(eq(report.targetUserId, userId), eq(report.status, "open"));

export const sanctionColumns = {
  active: sql<boolean>`${activeSanctionWhere}`,
  id: userSanction.id,
  type: userSanction.type,
  reason: userSanction.reason,
  expiresAt: userSanction.expiresAt,
  createdAt: userSanction.createdAt,
  revokedAt: userSanction.revokedAt,
  issuedBy: userSanction.issuedBy,
  revokedBy: userSanction.revokedBy,
};
