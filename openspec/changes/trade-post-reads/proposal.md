## Why

`trade_post` has been live and in step with the lists since 2026-11-15: 1,322 rows on production, and zero on all six drift checks. Every read still pairs the lists again through `lists.linked_list_id`, so the row cannot yet carry anything the later phases need (a post id on hides and offers, per-post rules, pause, a note). This change is phase 2 of the owner's phased rollout. It moves every read of the pairing that sits outside a write path onto the row, and changes nothing else.

## What Changes

- Two shared SQL helpers in `services/trade/lists.ts` state the pairing over the row. `postPairsSql(post, lead, want)` replaces `leadsPairSql`. `postPartnerSql(alias)` gives a list's partner from its row, and is used wherever a read takes the link as data today.
- `postsCte` is rebuilt to join `trade_post`, with the same rows and the same output columns. `on_trade` drops `linked_list_id`, which no consumer reads.
- These reads move to the row:
  - `candidates.ts`' `partner_post`;
  - the lead branch of `hidesOfSql`;
  - `fetchHiddenPosts.partnerName`;
  - the worker's `swapPair`;
  - `inPostsOf`;
  - `feedListColumns`;
  - `resolveTradeSides`;
  - `postWantedAmong`, `partnerListChoices` and `postListsOf`;
  - `reportedPost`;
  - `PublicList.linkedList`, through two relations on `lists` that reach the existing `tradePost` relations.
- The pure modules (`groupPosts`, `partnerOf`, `pickedSides`, `viewerPostOf`, `pairPosts`, `postSnapshot`) keep their `linkedListId` input. The server fills it from the row.
- The drift script gains six read-only equivalence checks:
  - the legacy `posts` CTE against the new one, both ways;
  - the pair predicate against the new one;
  - the hide predicate against the new one;
  - each list's partner;
  - the `linkedList` relation.

  These checks prove the change on production data, read-only, before it ships.
- Writers do not change. They still write the link on both rows and then call `syncPostRows`. Reads inside a write path, under `lockTradeLists`, stay on the link.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. No user, open tab or `/api/v1` caller can see the change, so `.openspec.yaml` sets `skip_specs: true`. What stays the same:

- post addresses (the anchor list), RPC inputs, output shapes and cache versions;
- hide behaviour, including today's two mismatches between the feed and matching.

Checked, with no change: `web-trade-browse`, `web-trade-for-you`, `web-trade-person-pages`, `web-trade-offers`, `web-lists`, `web-notifications`, `web-moderation`, `web-account`.

## Routes

No route changes. These routes read the moved statements:

- `/trade` (Browse) and `/trade/for-you`;
- `/trade/@{handle}` and its post page `/trade/@{handle}/{slug}`;
- `/trade/@{handle}/offer` (the offer builder);
- `/trade/new`;
- `/account/hidden`;
- `/list/{slug}`, `/@{nickname}/list` and `/@{nickname}/list/{slug}`;
- chat post cards, staff reports and want-list alerts;
- the `/api/v1` list reads (`list.findPublic`, `profiles.lists`).

## Non-goals

- `hidden_trade_post.post_id` and `offer.post_id`. Hides stay keyed on `list_id`, and offers on `post_list_id`. That is `trade-post-keys`, the next phase.
- Fixing the feed's and matching's disagreement about hides.
- Moving writers, `lockTradeLists` or `syncPostRows` onto the rows.
- Dropping or renaming `lists.linked_list_id`, or the raw `linkedListId` that `list.find` and report snapshots return.
- Post ids in URLs, inputs or `/api/v1` output.
- Any migration, schema change or `.tsx` change.

## Impact

- `packages/api`:
  - `services/trade/lists.ts`, `feed/query.ts`, `feed/entries.ts`, `feed/post-cards.ts`, `matches/candidates.ts`, `matches/recount.ts`, `hidden.ts`;
  - `services/offer/picker/shared.ts`, `theirs.ts`, `index.ts`;
  - `services/moderation/report.ts`, `services/list/read.ts`;
  - comments in `lib/trade-post-rows.ts`, and `docs/trade.md`.
- `packages/db`: `relation.ts` (two relations added, `lists.linkedList` removed) and the `tradePost` doc comment in `schema.ts`. No migration.
- `apps/worker`: `job/want-alerts/context.ts`, and `script/trade-post-drift.ts`. The worker image is rebuilt in the same rollout.
- `apps/web`: none.
