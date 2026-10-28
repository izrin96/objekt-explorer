# Tasks

## 1. Make offer fills by the pairing (packages/api)

- [x] 1.1 Write `fillMatches` in `lib/offer-prefill.ts` (design decision 1): the counted pair's swap matches, with `myListIds` / `partnerListIds` cut to the pair's lists, when `swapPair` is set and no post is named or the post is `swapPair.theirPostId`; otherwise the matches through the post (or all) on the side with more collections, You get on a tie. Add tests in `lib/offer-prefill.test.ts` for jun.p (Can swap plus one-way DCOs: only the pair), mina.k (cross-post: get only), a sales-only person, a tie, a post that is the pair's half, another post of a Can swap person, and a WTB post (give only); verify `bun test packages/api/src/lib/offer-prefill.test.ts` passes, and lint + typecheck pass for `@repo/api`
- [x] 1.2 Call `fillMatches` from `suggestOffer` in place of the two `matchesThrough` calls, reading `swapPair` from `matchCounts(partner)`, and report `matched` from what it returns; verify `bun test` and lint + typecheck pass for `@repo/api`, then, on the local database with the seeded `cansw-*` accounts (add a one-way DCO match to `cansw-same` for the Can swap case), `offer.suggest` for `cansw-cross` returns only You get and for `cansw-same` only the pair's two picks

## 2. The first line follows Can swap (packages/api, apps/web)

- [x] 2.1 Add `canSwap: z.boolean().optional()` to `storedMatchSchema` (`schemas/chat.ts`) and set it in `savedMatch` (`services/chat/cards.ts`) from `mutualOf(partner.counts) > 0`; extend `schemas/chat.test.ts` so a stored match without `canSwap` still parses; verify lint + typecheck pass for `@repo/api`
- [x] 2.2 Load `vercel-react-best-practices`, then make `forPost` (`features/chat/thread/suggestions.ts`) use the larger side's one-way suggestion (owner's on a tie) when `canSwap === false` and both counts are above zero; add or extend its test for Can swap, cross-post (`canSwap: false`), a tie, and an older card with no `canSwap`; verify the test passes, and lint + typecheck + build pass for `web`

## 3. Check in the running app

- [x] 3.1 On the local database with the `cansw-*` accounts, signed in as `cansw-vee`: Make offer on cansw-cross's row opens with the DCO-side pick under You get only and the line "Added 1 you get from your match"; on cansw-same's row with the pair's pick on each side only; Make offer on this post behaves the same; Message on cansw-cross's row offers "Hi! You have one I'm after. Open to an offer?" and on cansw-same's "Hi! We match on a few. Want to swap?". Record what was checked; no write reaches production
  - Checked 2026-10-28 on the local database and local Valkey (`.env.local`), dev server on :3200, in an isolated browser context; ownership reads went to the production indexer over its read-only connection. The one-way match outside the pair is `spring26-yejoon-101z`, held by cansw-same's wallet, on cansw-same's have list and cansw-vee's P1 want list; cansw-same's row read They have 2, You have 1, You can swap 1.
  - `offer.suggest` (curl): cansw-cross gave You get `atom01-kaede-319z` only; cansw-same gave `autumn26-kyuhyuk-108z` ↔ `cream02-sohyun-101z` with no YeJoon; with `post` (either half of the pair), the same.
  - Builder from the row: cansw-cross showed "Added 1 you get from your match" with You give empty; cansw-same showed "Added 1 you give and 1 you get from your matches" (KyuHyuk 108Z ↔ SoHyun 101Z). From Make offer on this post: "Added from p have: 1 you get" and "Added from p have: 1 you give and 1 you get". No offer was sent.
  - Message (local conversations 387 and 388, empty): cansw-cross offered "Hi! You have one I'm after. Open to an offer?" and cansw-same "Hi! We match on a few. Want to swap?".

## 4. Documentation

- [x] 4.1 Update `packages/api/AGENTS.md` (Offer get sources: `suggestOffer` fills through `fillMatches`, the Can swap pair or the bigger side; Chat cards: the saved match carries `canSwap`) and state that `apps/web/AGENTS.md` needs no change, or update it if 2.2 altered a convention; verify `bun run check` passes
  - `apps/web/AGENTS.md` needs no change: its Chat draft section already says the first-line suggestion follows `view.match`, the match the server saved, and 2.2 changed no convention.

## Workflow follow-up

- Review the change, commit when asked, then `/opsx:archive` it once deployed, after `can-swap-per-post`.
