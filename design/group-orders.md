# Group orders (GO / GOM)

Plan for group orders on Objekt Explorer, from user feedback (Oct 2026). Low priority, nothing built. The mockup is the last section of `design/trade-feedback-mockup.html`.

A group order (GO) is run by a Group Order Manager (GOM) who buys items in bulk for participants and delivers them: digital objekts by wallet transfer, physical objekts and merch by post. The site never handles money or addresses; it tracks who signed up, who paid, and what was delivered, and keeps the GOM accountable over orders that can run for months.

## Becoming a GOM

- A user sends a request: verified Cosmo account (required), Discord / X, links to past GOs, regions served, payment methods.
- Admins and moderators approve or reject it with a reason, and can remove GOM status later.
- GOM is a user status with a badge. GOMs are not part of the site team: no admin access, not listed on About us.
- New GOMs start with limits (e.g. 1 open order, a cap on participants) that lift as they build a track record.

## A group order

- Title, description, rules: payment methods, fees, shipping regions and the shipping fee per region.
- Deadlines: sign-ups close, payment due, expected delivery.
- Slots: what's offered, price per slot, how many. Prices show next to the starting prices.

## What can be sold

| Item            | Picked from     | Delivery confirmed by                                          |
| --------------- | --------------- | -------------------------------------------------------------- |
| Digital objekt  | the objekt list | the chain, automatically (GOM's wallet → participant's wallet) |
| Physical objekt | the objekt list | the participant marking it "received"                          |
| Merch           | free text + a picture | the participant marking it "received"                    |

## Sign-ups and payment

- Verified users only. A full slot gets a waitlist. The GOM can accept or remove sign-ups until the order closes.
- The site never handles money. The participant marks payment "sent", the GOM marks it "received". A second payment round for shipping is allowed.

## Shipping (physical objekts and merch)

- The site never stores addresses. GOMs collect them their usual way (form, DM).
- Tracked steps: participant "shipping details sent" → GOM "shipped" (with a tracking number if they have one) → participant "received".

## Stages

```
Open → Closed → Ordered → Delivering → Completed
                 (any stage before Completed) → Cancelled
                 (any stage before Completed) ⇄ Frozen
```

| Stage      | What happens                                   | Moves on when                                           |
| ---------- | ---------------------------------------------- | ------------------------------------------------------- |
| Open       | users pick slots                               | the GOM closes it, or the sign-up deadline passes       |
| Closed     | sign-ups locked, participants pay              | the GOM places the order                                |
| Ordered    | the GOM buys the items                         | the items reach the GOM                                 |
| Delivering | objekts sent, parcels shipped                  | every participant has received                          |
| Completed  | done                                           |                                                         |
| Cancelled  | by the GOM or a moderator, with a reason; everyone signed up is told |                                   |
| Frozen     | by a moderator: no new sign-ups, a banner shows; unfreezing returns it to the stage it was in | |

## Long timelines and updates

Merch can take 2–3 months, so an order stays open as long as it needs. In return the GOM posts status updates (text + optional picture):

- Required every 14 days while Ordered or Delivering. The GOM gets a reminder after 10 days.
- 14 days without an update: "update overdue" shows on the order.
- 30 days without an update: the order is flagged to moderators.
- Moving the delivery date needs an update with a reason; participants are notified.
- After the expected delivery date, anyone who hasn't received gets a "not received" button that flags the order to moderators.

## Safety nets (same as trades)

- Chat: announcements to everyone, plus 1-to-1 with the GOM. Kept until 15 days after the order ends, in case MODHAUS needs data.
- Ratings after delivery, reports, blocking.
- GOM reputation: completed orders, on-time delivery, on-time updates, delays announced early, ratings, reports.

## What already exists to build on

| Need                                   | Existing piece                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| Verified Cosmo account                 | linked addresses (`/account › Profiles`)                                       |
| Digital delivery confirmed on chain    | the trade verifier in the worker (indexer transfers + Valkey nudge + rescan)   |
| GOM approval, removal, freeze, flags   | the moderation router and its audit log                                        |
| Announcements and 1-to-1 chat          | chat (one thread per pair) — needs a new one-to-many thread kind               |
| Reminders, overdue, "date moved"       | notifications + `Bun.cron` in the worker                                       |
| Ratings, reports, blocking             | trade reputation, reports, blocks                                              |
| Objekt picker for slots                | the offer picker                                                               |

New: GOM applications and status, orders, slots, sign-ups with waitlist, payment rounds, shipping steps, updates, and the order chat thread.

## Open questions

1. "Prices show next to the starting prices": starting price of what? The objekt's Market price, or the slot's price before fees?
2. Waitlist: does a freed slot go to the next person automatically, or does the GOM pick?
3. New-GOM limits: actual numbers, and what lifts them (N completed orders? a rating floor?).
4. Chat retention: trade chats today have no 15-day cut-off. Is this a GO-only rule, and is it deletion or archive?
5. Can a participant leave after Closed? What happens to a paid slot if the order is cancelled (the site can't refund, so just a record)?
6. Digital objekts: does the GOM have to send from a linked address, so the verifier can match the transfer?
7. Unscanned objekts (from the trade feedback) fit here as "physical objekt". Is that enough, or do people want to sell unscanned cards outside a GO too?
8. Currency per order, or per slot?

## Suggested phasing

1. GOM applications + moderation review + badge.
2. Orders with digital objekt slots only: sign-ups, waitlist, payment marks, on-chain delivery. Reuses the most and proves the flow.
3. Physical objekts and merch: shipping steps, received marks.
4. Updates, overdue/flag rules, delivery-date changes.
5. Order chat (announcements), ratings, GOM reputation.
