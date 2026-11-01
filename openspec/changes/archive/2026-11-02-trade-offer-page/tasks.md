## 0. Before starting

- [x] 0.1 Confirm `trade-person-and-post-pages` is applied: the `trade/@{$handle}` layout resolves handles, and `trade.people` rows carry `handle`. Verify that `bun run check` passes on that base.

## 1. The start recipe

- [x] 1.1 Add `features/offers/offer-link.ts` (design decision 1): `offerSearchSchema`, `offerLink(start)` and `requestOf(search, partner)`. Add `offer-link.test.ts` covering a round trip for:
  - the row's matches under Compare with and Mutual;
  - one post;
  - a near pick;
  - chat with and without a post card;
  - a counter;
  - a Market listing;
  - a bare conversation;

  and the rejection of an outside or protocol-relative `from`. Verify that the test passes, and that lint and typecheck pass for `web`.

## 2. The page

- [x] 2.1 Load `vercel-react-best-practices`, `vercel-composition-patterns`, `router-core`, `tanstack-router-best-practices` and `router-query`. Add `routes/(container)/trade/@{$handle}/offer.tsx` (design decision 2):
  - the sign-in redirect;
  - `validateSearch`;
  - the loader for a counter and for a conversation's name;
  - the can't-counter state.

  Confirm that the handle layout keeps the search when it redirects (`trade-person-and-post-pages` design decision 3). Verify that lint, typecheck and build pass for `web`.
- [x] 2.2 Lay `BuilderForm` out through named slots (design decision 3). Move `MatchesBuilder`'s status region into a slot above the sides, and make `BuilderHeader` an `h1` that takes focus. Arrange the slots as variant A, including the phone bottom bar (design decision 7). Verify that there is one region for the matches line on the page, beside each side's own banner for blocked picks (`grep` the render, and check in the browser in 4.2), and that lint, typecheck and build pass for `web`.
- [x] 2.3 Turn `OfferPicker` into a `Sheet` (design decision 4). Verify that lint, typecheck and build pass for `web`.
- [x] 2.4 Leaving (design decision 5): `useBlocker` with `enableBeforeUnload` on `holdsDraft`, the discard prompt, Back and Cancel to `from`, and a `replace` to the conversation on send. Verify the `draft.ts` tests still pass, and that lint, typecheck and build pass for `web`.

## 3. Callers

- [x] 3.1 Point every caller at the page through `offerLink` (design decision 6):
  - `MakeOfferButton` and `TradeActions`;
  - `PostBlock`'s Make offer and Make offer with it;
  - chat's Add to message and deal strip, with focus back on Add to message on return;
  - Counter (`counterRequest`'s data now comes through the loader);
  - `next-step-banner.tsx`;
  - the Market row.

  Delete `OfferBuilder`, `useOfferBuilder`, `OfferBuilderProvider` and `useSharedOfferBuilder`. Add the new strings in en, ko and ja. Verify that `grep` finds none of those four names left in `apps/web/src`, and that lint, typecheck and build pass for `web`.

## 4. Verify

- [x] 4.1 Run `bun run check` and `bun run build --filter=web`. Both pass.
- [x] 4.2 Browser check with `browser-use`, following the rules in the user's global CLAUDE.md: your own tab, an isolated context for signed out, and wait for hydration before submitting any login. Use the dev server with `.env.local` on the local database. Open the page from every source, at 1440 px and 390 px:
  - a Trade row, under Mutual and Compare with;
  - a post menu and a near match;
  - the person and post pages;
  - chat's Add to message and deal strip;
  - Counter;
  - the trade page;
  - a Market listing.

  For each, check:
  - the matches line, the sides and the picker sheet;
  - Back, Cancel, a link away and a reload, each with and without a draft;
  - a signed-out visit;
  - a non-canonical handle;
  - Back landing where it started: the same row of a scrolled Browse or For you, the same place in the thread, and the page under a Market drawer.

  Leave Send unclicked unless the user approves sending an offer between local accounts; otherwise verify the `offer.create` input up to the request boundary. Record what was checked and on which database.

## 5. Docs

- [x] 5.1 Update the Offer builder section of `apps/web/AGENTS.md`: the page, its slots, the one status region now above the sides, `offerLink` as the only way to open it, and leaving through `useBlocker`. Remove the dialog wording. Verify that `openspec validate trade-offer-page --strict` passes.

## Workflow follow-up

- Remove the prototype worktree `.claude/worktrees/proto-offer-page` and branch `proto/offer-page`, or keep them as a patch if the user asks.
- Archive with `/opsx:archive` after `trade-person-and-post-pages` is archived.
