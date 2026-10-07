import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts } from "@repo/db/indexer/schema";
import { message, report, trade, userBlock } from "@repo/db/schema";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";

import { canReport } from "../lib/offer-rules";
import { reportRetryAt, shapeExcerpt, shapeExcerptOffer } from "../lib/sanctions";
import type { ReportInput } from "../schemas/moderation";
import { afterBlockChange, findMembership, parseCard } from "./chat";
import { findAccount, refuseModeration } from "./moderation";
import { type CancelResult, cancelOpenOffers, offersBetween, publishCancelled } from "./offer";
import { fetchOffers } from "./offer-view";

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

/** The excerpt and the also-block land in the report's transaction, or not at all. */
export async function fileReport(me: string, input: ReportInput) {
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
    if (!canReport({ ...between, verifiedLegs: 0 }, new Date())) {
      refuseModeration("not_reportable");
    }
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
              unsentAt: message.unsentAt,
            })
            .from(message)
            .where(eq(message.conversationId, input.conversationId))
            .orderBy(desc(message.id))
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
                unsent: m.unsentAt !== null,
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
}
