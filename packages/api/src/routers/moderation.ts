import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts } from "@repo/db/indexer/schema";
import {
  conversation,
  message,
  messageFlag,
  modAudit,
  notification,
  report,
  trade,
  tradeLeg,
  userAddress,
  userBlock,
  userSanction,
} from "@repo/db/schema";
import { and, desc, eq, gt, inArray, or, sql } from "drizzle-orm";

import { canReport } from "../lib/offer-rules";
import { reportRetryAt, sanctionEnd, shapeExcerpt, shapeExcerptOffer } from "../lib/sanctions";
import { authed, moderator } from "../orpc";
import { FLAG_CATEGORIES, type FlagCategory } from "../schemas/chat";
import {
  actInputSchema,
  EXCERPT_SIZE,
  excerptEntrySchema,
  isStaffRole,
  REPORT_REASONS,
  type ReportReason,
  reportInputSchema,
  revokeInputSchema,
  roleList,
  setRoleInputSchema,
  userIdInputSchema,
} from "../schemas/moderation";
import type { SanctionPayload } from "../schemas/notification";
import type { TradeStatus } from "../schemas/offer";
import {
  afterBlockChange,
  fetchPartners,
  findMembership,
  hydrateCards,
  parseCard,
} from "../services/chat";
import {
  audit,
  changeRole,
  findAccount,
  openReportsOf,
  refuseModeration,
  sanctionColumns,
  syncBan,
} from "../services/moderation";
import {
  type CancelResult,
  cancelOpenOffers,
  offersBetween,
  offersOf,
  publishCancelled,
} from "../services/offer";
import { fetchOffers } from "../services/offer-view";
import { activeSanctionWhere } from "../services/safety";
import { bumpSafetyVersions } from "../services/safety-cache";
import { publishNotify, publishSessionRevoked } from "../user-socket";

const PAGE_LIMIT = 100;

/** The offers behind shared messages, as they stand now, so the report keeps what was offered. */
async function excerptOffers(offerIds: number[], targetUserId: string, now: Date) {
  const offers = [...(await fetchOffers(offerIds)).values()];
  const objektIds = [
    ...new Set(offers.flatMap((o) => o.items.flatMap(([, , objektId]) => objektId ?? []))),
  ];
  const serials =
    objektIds.length === 0
      ? []
      : await indexer
          .select({ id: objekts.id, serial: objekts.serial })
          .from(objekts)
          .where(inArray(objekts.id, objektIds));
  const serialOf = new Map(serials.map((row) => [row.id, row.serial]));
  return new Map(
    offers.map((o) => [
      o.id,
      shapeExcerptOffer(
        {
          id: o.id,
          fromUserId: o.from_user_id,
          toUserId: o.to_user_id,
          status: o.status,
          expiresAt: o.expires_at,
          topupAmount: o.topup_amount,
          topupCurrency: o.topup_currency,
          topupPayer: o.topup_payer,
          note: o.note,
          items: o.items.map(([side, collectionSlug, objektId]) => ({
            side,
            collectionSlug,
            objektId,
          })),
        },
        targetUserId,
        now,
        (id) => serialOf.get(id) ?? null,
      ),
    ]),
  );
}

const iso = (at: string | null) => (at === null ? null : new Date(at).toISOString());

const countBy = <K extends string>(keys: readonly K[], rows: { key: string; count: number }[]) =>
  Object.fromEntries(
    keys.map((key) => [key, rows.find((row) => row.key === key)?.count ?? 0]),
  ) as Record<K, number>;

async function flagCounts(userIds: string[]) {
  if (userIds.length === 0) return [];
  // counts only: a flag is never joined to its message
  return db
    .select({
      userId: messageFlag.userId,
      key: messageFlag.category,
      count: sql<number>`count(*)::int`,
    })
    .from(messageFlag)
    .where(inArray(messageFlag.userId, userIds))
    .groupBy(messageFlag.userId, messageFlag.category);
}

/**
 * The trades attached to the account's open reports: status, legs, hashes and times, and
 * never message text.
 */
async function attachedTrades(userId: string, tradeIds: number[]) {
  const ids = [...new Set(tradeIds)];
  if (ids.length === 0) return { trades: [], collections: {} };
  const [rows, legs] = await Promise.all([
    db
      .select({
        id: trade.id,
        status: trade.status,
        cancelReason: trade.cancelReason,
        userA: trade.userA,
        userB: trade.userB,
        acceptedAt: trade.acceptedAt,
        endedAt: trade.endedAt,
      })
      .from(trade)
      .where(inArray(trade.id, ids))
      .orderBy(desc(trade.acceptedAt)),
    db.select().from(tradeLeg).where(inArray(tradeLeg.tradeId, ids)).orderBy(tradeLeg.id),
  ]);
  const { serial, collections } = await hydrateCards(
    legs.map((leg) =>
      leg.objektId === null
        ? { collectionSlug: leg.collectionSlug }
        : { collectionSlug: leg.collectionSlug, objektId: leg.objektId },
    ),
  );
  return {
    trades: rows.map((t) => ({
      id: t.id,
      status: t.status as "in_progress" | "completed" | "cancelled" | "failed",
      cancelReason: t.cancelReason,
      acceptedAt: iso(t.acceptedAt)!,
      endedAt: iso(t.endedAt),
      otherId: t.userA === userId ? t.userB : t.userA,
      legs: legs
        .filter((leg) => leg.tradeId === t.id)
        .map((leg) => ({
          id: leg.id,
          collectionSlug: leg.collectionSlug,
          objektId: leg.objektId,
          serial: leg.objektId === null ? null : serial(leg.objektId),
          /** the reported account gives this leg */
          fromTarget: leg.fromUserId === userId,
          state: (leg.verifiedAt !== null ? "verified" : leg.open ? "waiting" : "closed") as
            | "verified"
            | "waiting"
            | "closed",
          verifiedAt: iso(leg.verifiedAt),
          txHash: leg.txHash,
          verifiedObjektId: leg.verifiedObjektId,
        })),
    })),
    collections,
  };
}

export const moderationRouter = {
  block: authed.input(userIdInputSchema).handler(async ({ input: { userId }, context }) => {
    const me = context.session.user.id;
    if (userId === me) refuseModeration("self");
    await findAccount(userId);
    const cancelled = await db.transaction(async (tx) => {
      await tx.insert(userBlock).values({ blockerId: me, blockedId: userId }).onConflictDoNothing();
      return cancelOpenOffers(tx, offersBetween(me, userId), "blocked");
    });
    await afterBlockChange(me, userId);
    await publishCancelled(cancelled);
  }),

  unblock: authed.input(userIdInputSchema).handler(async ({ input: { userId }, context }) => {
    const me = context.session.user.id;
    await db
      .delete(userBlock)
      .where(and(eq(userBlock.blockerId, me), eq(userBlock.blockedId, userId)));
    await afterBlockChange(me, userId);
  }),

  /** The accounts the user blocked, newest first, headed as a conversation heads them. */
  blocked: authed.handler(async ({ context }) => {
    const rows = await db
      .select({ userId: userBlock.blockedId, blockedAt: userBlock.createdAt })
      .from(userBlock)
      .where(eq(userBlock.blockerId, context.session.user.id))
      .orderBy(desc(userBlock.createdAt));
    const partners = await fetchPartners(rows.map((row) => row.userId));
    return rows.flatMap((row) => {
      const partner = partners.get(row.userId);
      return partner ? [{ ...partner, blockedAt: iso(row.blockedAt)! }] : [];
    });
  }),

  /** The excerpt and the also-block land in the report's transaction, or not at all. */
  report: authed.input(reportInputSchema).handler(async ({ input, context }) => {
    const me = context.session.user.id;
    if (input.userId === me) refuseModeration("self");
    await findAccount(input.userId);
    if (input.conversationId !== undefined) {
      const { partnerId } = await findMembership(input.conversationId, me);
      if (partnerId !== input.userId) throw new ORPCError("NOT_FOUND");
    }
    if (input.tradeId !== undefined) {
      const [between] = await db
        .select({ status: trade.status, acceptedAt: trade.acceptedAt, endedAt: trade.endedAt })
        .from(trade)
        .where(
          and(
            eq(trade.id, input.tradeId),
            or(
              and(eq(trade.userA, me), eq(trade.userB, input.userId)),
              and(eq(trade.userA, input.userId), eq(trade.userB, me)),
            ),
          ),
        );
      if (!between) throw new ORPCError("NOT_FOUND");
      const state = { ...between, status: between.status as TradeStatus, verifiedLegs: 0 };
      if (!canReport(state, new Date())) refuseModeration("not_reportable");
    }

    const { id, cancelled } = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('chat_report'), hashtext(${me}))`);
      const [last] = await tx
        .select({ createdAt: report.createdAt })
        .from(report)
        .where(and(eq(report.reporterId, me), eq(report.targetUserId, input.userId)))
        .orderBy(desc(report.createdAt))
        .limit(1);
      const retryAt = reportRetryAt(last?.createdAt ?? null, new Date());
      if (retryAt) refuseModeration("report_limit", retryAt);

      const shared =
        input.share && input.conversationId !== undefined
          ? await tx
              .select({
                id: message.id,
                senderId: message.senderId,
                body: message.body,
                card: message.card,
                offerId: message.offerId,
                createdAt: message.createdAt,
              })
              .from(message)
              .where(eq(message.conversationId, input.conversationId))
              .orderBy(desc(message.id))
              .limit(EXCERPT_SIZE)
          : null;
      const offers = shared
        ? await excerptOffers(
            shared.flatMap((m) => m.offerId ?? []),
            input.userId,
            new Date(),
          )
        : null;

      const [row] = await tx
        .insert(report)
        .values({
          reporterId: me,
          targetUserId: input.userId,
          conversationId: input.conversationId ?? null,
          tradeId: input.tradeId ?? null,
          reason: input.reason,
          note: input.note || null,
          excerpt: shared
            ? shapeExcerpt(
                shared.map((m) => ({
                  id: m.id,
                  senderId: m.senderId,
                  body: m.body,
                  card: parseCard(m.card),
                  offer: (m.offerId === null ? undefined : offers?.get(m.offerId)) ?? null,
                  createdAt: m.createdAt,
                })),
                input.userId,
              )
            : null,
        })
        .returning({ id: report.id });
      let cancelled: CancelResult | null = null;
      if (input.alsoBlock) {
        await tx
          .insert(userBlock)
          .values({ blockerId: me, blockedId: input.userId })
          .onConflictDoNothing();
        cancelled = await cancelOpenOffers(tx, offersBetween(me, input.userId), "blocked");
      }
      return { id: row!.id, cancelled };
    });

    if (input.alsoBlock) await afterBlockChange(me, input.userId);
    if (cancelled) await publishCancelled(cancelled);
    return { id };
  }),

  /** Open reports grouped by reported account, newest first. */
  queue: moderator.handler(async () => {
    const groups = await db
      .select({
        userId: report.targetUserId,
        open: sql<number>`count(*)::int`,
        latestAt: sql<string>`max(${report.createdAt})::text`,
      })
      .from(report)
      .where(eq(report.status, "open"))
      .groupBy(report.targetUserId)
      .orderBy(sql`max(${report.createdAt}) DESC`)
      .limit(PAGE_LIMIT);
    const ids = groups.map((group) => group.userId);
    const [partners, flags, reasons] = await Promise.all([
      fetchPartners(ids),
      flagCounts(ids),
      ids.length === 0
        ? []
        : db
            .select({
              userId: report.targetUserId,
              key: report.reason,
              count: sql<number>`count(*)::int`,
            })
            .from(report)
            .where(and(eq(report.status, "open"), inArray(report.targetUserId, ids)))
            .groupBy(report.targetUserId, report.reason),
    ]);

    return groups.flatMap((group) => {
      const partner = partners.get(group.userId);
      if (!partner) return [];
      return [
        {
          ...partner,
          openReports: group.open,
          latestAt: iso(group.latestAt)!,
          reasons: countBy<ReportReason>(
            REPORT_REASONS,
            reasons.filter((row) => row.userId === group.userId),
          ),
          flags: countBy<FlagCategory>(
            FLAG_CATEGORIES,
            flags.filter((row) => row.userId === group.userId),
          ),
        },
      ];
    });
  }),

  /** Everything a moderator sees about one account. Message text appears only inside excerpts. */
  account: moderator.input(userIdInputSchema).handler(async ({ input: { userId } }) => {
    const account = await findAccount(userId);
    const [partners, addresses, [starts], flags, reports, sanctions, auditRows] = await Promise.all(
      [
        fetchPartners([userId]),
        db
          .select({
            address: userAddress.address,
            nickname: userAddress.nickname,
            linkedAt: userAddress.linkedAt,
          })
          .from(userAddress)
          .where(eq(userAddress.userId, userId)),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(conversation)
          .where(
            and(
              eq(conversation.createdBy, userId),
              gt(conversation.createdAt, sql`now() - interval '24 hours'`),
            ),
          ),
        flagCounts([userId]),
        db
          .select({
            id: report.id,
            reporterId: report.reporterId,
            reason: report.reason,
            note: report.note,
            excerpt: report.excerpt,
            status: report.status,
            conversationId: report.conversationId,
            tradeId: report.tradeId,
            createdAt: report.createdAt,
            resolvedAt: report.resolvedAt,
          })
          .from(report)
          .where(eq(report.targetUserId, userId))
          .orderBy(desc(report.createdAt))
          .limit(PAGE_LIMIT),
        db
          .select(sanctionColumns)
          .from(userSanction)
          .where(eq(userSanction.userId, userId))
          .orderBy(desc(userSanction.createdAt)),
        db
          .select({
            id: modAudit.id,
            actorId: modAudit.actorId,
            action: modAudit.action,
            reportIds: modAudit.reportIds,
            detail: modAudit.detail,
            createdAt: modAudit.createdAt,
          })
          .from(modAudit)
          .where(eq(modAudit.targetUserId, userId))
          .orderBy(desc(modAudit.createdAt))
          .limit(PAGE_LIMIT),
      ],
    );

    const attached = await attachedTrades(
      userId,
      reports.flatMap((r) => (r.status === "open" && r.tradeId !== null ? [r.tradeId] : [])),
    );
    const people = await fetchPartners([
      ...attached.trades.map((t) => t.otherId),
      ...reports.map((r) => r.reporterId),
      ...sanctions.flatMap((s) => [s.issuedBy, s.revokedBy].filter((id) => id !== null)),
      ...auditRows.flatMap((a) => (a.actorId ? [a.actorId] : [])),
    ]);
    const nameOf = (id: string | null) =>
      id === null ? null : (people.get(id) ?? { userId: id, user: null, identity: null });
    return {
      account: {
        ...partners.get(userId)!,
        createdAt: account.createdAt.toISOString(),
        role: account.role ?? "user",
        banned: account.banned ?? false,
        banReason: account.banReason ?? null,
        banExpires: account.banExpires?.toISOString() ?? null,
      },
      addresses: addresses.map((a) => ({
        address: a.address.toLowerCase(),
        nickname: a.nickname,
        linkedAt: iso(a.linkedAt),
      })),
      startsLast24h: starts?.count ?? 0,
      flags: countBy<FlagCategory>(
        FLAG_CATEGORIES,
        flags.map((row) => ({ key: row.key, count: row.count })),
      ),
      reports: reports.map((r) => {
        const excerpt = excerptEntrySchema.array().safeParse(r.excerpt);
        return {
          id: r.id,
          reporter: nameOf(r.reporterId),
          reason: r.reason as ReportReason,
          note: r.note,
          status: r.status as "open" | "dismissed" | "actioned",
          fromConversation: r.conversationId !== null,
          tradeId: r.tradeId,
          excerpt: excerpt.success ? excerpt.data : null,
          createdAt: iso(r.createdAt)!,
          resolvedAt: iso(r.resolvedAt),
        };
      }),
      sanctions: sanctions.map((s) => ({
        id: s.id,
        type: s.type as "warn" | "chat_mute" | "trade_block" | "ban",
        reason: s.reason,
        expiresAt: iso(s.expiresAt),
        createdAt: iso(s.createdAt)!,
        revokedAt: iso(s.revokedAt),
        active: s.active,
        issuedBy: nameOf(s.issuedBy),
        revokedBy: nameOf(s.revokedBy),
      })),
      trades: attached.trades.map(({ otherId, ...t }) => ({ ...t, other: nameOf(otherId) })),
      tradeCollections: attached.collections,
      audit: auditRows.map((a) => ({
        id: a.id,
        actor: nameOf(a.actorId),
        action: a.action,
        reportIds: a.reportIds ?? [],
        detail: a.detail as Record<string, unknown> | null,
        createdAt: iso(a.createdAt)!,
      })),
    };
  }),

  /** Applies the action, resolves the account's open reports and audits it, all at once. */
  act: moderator.input(actInputSchema).handler(async ({ input, context }) => {
    const me = context.session.user.id;
    if (input.userId === me) refuseModeration("self");
    const target = await findAccount(input.userId);
    if (isStaffRole(target.role) && !context.isAdmin) refuseModeration("staff_target");

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
    if (input.action === "ban") await publishSessionRevoked(input.userId);
    else if (input.action !== "dismiss") await publishNotify(input.userId);
    if (result.cancelled) await publishCancelled(result.cancelled);
    return { sanctionId: result.sanctionId, resolvedReports: result.resolvedReports };
  }),

  revoke: moderator.input(revokeInputSchema).handler(async ({ input, context }) => {
    const me = context.session.user.id;
    const [sanction] = await db
      .select({ ...sanctionColumns, userId: userSanction.userId })
      .from(userSanction)
      .where(and(eq(userSanction.id, input.sanctionId), activeSanctionWhere));
    if (!sanction) refuseModeration("not_active");
    const target = await findAccount(sanction.userId);
    if (isStaffRole(target.role) && !context.isAdmin) refuseModeration("staff_target");

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
  }),

  /** Admins only: grants or removes the moderator role; an admin's role is not changed here. */
  setRole: moderator.input(setRoleInputSchema).handler(async ({ input, context }) => {
    if (!context.isAdmin) throw new ORPCError("FORBIDDEN");
    const me = context.session.user.id;
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
  }),
};
