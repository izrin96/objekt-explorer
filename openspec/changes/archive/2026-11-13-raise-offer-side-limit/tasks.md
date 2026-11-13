# Tasks

Each group ends with `bun run check` (lint, typecheck and test across the repo) and `bun run build --filter=web` passing; `@repo/api` has no build of its own, so the web build covers it. Tests are `bun test` on pure modules only: the root `.env` is production, so no test touches the database, Redis or Cosmo. A web test imports Paraglide's compiled messages, so run web tests from `apps/web` after `bun run paraglide:compile`. No `git stash` (use a WIP commit if a checkpoint is needed, and only with the owner's go-ahead to commit), no commits, no database writes outside the local compose database. Before editing a `.tsx` in `apps/web`, load `vercel-react-best-practices` (the repo's hook holds the edit until it is loaded).

## 1. Starting point

- [x] 1.1 Confirm the deltas still match the main specs: `openspec validate raise-offer-side-limit --strict` passes with no "Archive would refuse this delta" line, and each MODIFIED requirement in `specs/web-trade-offers/spec.md` and `specs/web-trade-near-matches/spec.md` differs from its block in `openspec/specs/<capability>/spec.md` only in the numbers this change sets (200, 197, 210). If another change has edited one of those requirements since, stop and ask the owner.

## 2. Prerequisite: one copies read for a counter's any-copy asks (design, Decision 5)

- [x] 2.1 `packages/api/src/schemas/offer.ts`, `pickerNarrowingSchema`: add the optional field `copiesOf: z.array(slugSchema).min(1).max(OFFER_SIDE_LIMIT).optional()` after `objektIds`, with a one-line doc comment in the style of its neighbours ("mine: every copy of these collections, unpaged, for a counter's any-copy asks"). Nothing else in the schema changes, so an open tab's input still validates. Verify with `bun run typecheck --filter=@repo/api`.
- [x] 2.2 `packages/api/src/services/offer/picker/mine.ts`, `mineCandidates`: destructure `copiesOf` beside `objektIds`. When `copiesOf` is set:
  - The owned read is `ownedQuery(addresses, { filters, slugs: copiesOf, where: fromWhere })` (`picker/shared.ts`), ordered `asc(objekts.serial), asc(objekts.id)` with no limit (the order a picker page gives a collection's copies, so an ask takes the same copy as before; the review corrected the first plan's newest-first), mapped through `lowerOwner` (`services/offer/core.ts`), with `nextCursor: null`. Every other case keeps today's `ownedPage` / `ownedGroupPage` call.
  - The have-list read still runs, as it does for a first page, and the suggestions are narrowed to the same collections: the `kept` set at `:144` becomes `copiesOf ?? keptSlugs`.
  - The suggestions are not cut by `pageByCollection` on a copies read, and the have-list reads are narrowed to `copiesOf`, so every asked collection keeps its have-list copies.
  - `reservedIds` and `openOfferHolders` (`services/offer/core.ts`) take their ids as one array parameter (`= ANY`), since an unpaged read can pass the bind limit.
  - The flag reads below (`reservedIds`, `openOfferHolders`, `anchoredSerialIds`, `collectionsOf`) are unchanged: one statement each over the ids.

  Read-only verify on the local stack (group 5's setup, signed in as localtest1): `POST /rpc/offer/candidates` with body `{"json":{"conversationId":<one of localtest1's conversations>,"side":"mine","copiesOf":["<slug A>","<slug B>"]}}` (two collections localtest1 holds several copies of, from a plain `side: "mine"` page) returns every copy of both and `nextCursor: null`, and the same ids as the two per-collection reads (`filters` with that collection's `member`, `season` and `collection`) together.
- [x] 2.3 `apps/web/src/features/offers/queries.ts`: replace `myCopyOptions(to, collection)` with `myAskCopiesOptions(to, slugs: string[])`, an `orpc.offer.candidates.queryOptions` with input `{ ...to, side: "mine", copiesOf: slugs.length > 0 ? slugs : undefined }`, `enabled: slugs.length > 0`, `staleTime: 30_000` and `retry: retryUnlessRefused`, as its neighbours. Keep a one-line doc comment saying what it reads. Verify `grep -rn "myCopyOptions" apps/web/src` finds nothing once 2.4 is done.
- [x] 2.4 `apps/web/src/features/offers/builder/form.tsx:157-165`: replace the `useQueries` over `asks` with one `useQuery(myAskCopiesOptions(to, askSlugs))`, where `askSlugs` is the distinct `collectionSlug`s of `asks`, sorted (so the query key is stable). `giveShown` becomes `resolveAsks(give, asks.map(() => askCopies.data))`, and `loadingAsks` holds every ask's key while `asks.length > 0 && askCopies.isPending`, else none. `collections` is no longer needed for this read. In `builder/draft.ts:155`, change the `Page` doc comment to name `myAskCopiesOptions` and say that one page serves every ask. Verify with `bun run typecheck --filter=web`.
- [x] 2.5 `apps/web/src/features/offers/builder/draft.test.ts`, `describe("resolveAsks")`: add a case where two asks of different collections (one with `count: 2`) receive the same page holding copies of both collections and of a third: each ask takes only copies of its own collection, the count-2 ask takes two, no copy goes to both, and the third collection's copies go unused. Verify with `cd apps/web && bun run paraglide:compile && bun test src/features/offers/builder/draft.test.ts`. Then `bun run check` and `bun run build --filter=web` pass.

## 3. The constant and the API docs

- [x] 3.1 `packages/api/src/schemas/offer.ts:8`: set `OFFER_SIDE_LIMIT = 200`. Change nothing else in the file: `give`/`get` keep `.max(OFFER_SIDE_LIMIT * 10)` (design, Decision 4), and `objektIds` and `copiesOf` keep `.max(OFFER_SIDE_LIMIT)`. Leave `CANDIDATE_PAGE_SIZE`, `OFFER_VIEWS_LIMIT` and `NOTE_OBJEKTS` as they are. Verify with `bun test packages/api/src/lib/offer-rules.test.ts`: its `too_many` case builds `OFFER_SIDE_LIMIT + 1` items and still refuses.
- [x] 3.2 `packages/api/src/lib/offer-prefill.test.ts:115-122`: the test "caps each side at 50 and counts every eligible match" builds 60 give matches and expects 50.
  - Rename it "caps each side at the side limit and counts every eligible match".
  - Build `OFFER_SIDE_LIMIT + 10` give matches (`Array.from({ length: OFFER_SIDE_LIMIT + 10 }, …)`).
  - Expect `picks.give` to have length `OFFER_SIDE_LIMIT`, and `picks.matched` to equal `{ give: OFFER_SIDE_LIMIT + 10, get: 1 }`.
  - Import `OFFER_SIDE_LIMIT` from `../schemas/offer`.
  - Leave the other 50s in that file alone: they are list entry serials (`:312-316`).

  Verify with `bun test packages/api/src/lib/offer-prefill.test.ts`.
- [x] 3.3 `packages/api/docs/offers.md`, Offer get sources. After the bullet that ends "a collection over `CANDIDATE_PAGE_SIZE` being a page of its own", add two sentences:
  - `OFFER_SIDE_LIMIT` stays at or below `CANDIDATE_PAGE_SIZE`. A counter's give picks take their flags from one unpaged `offer.candidates` read (`objektIds`, through `ownedPage`), which returns at most one page, so raising the limit past the page size needs that read paged first.
  - A counter's any-copy asks take their copies from one `copiesOf` read of every copy of their collections, never one read per ask, since `offer.candidates` allows 120 calls a minute per user.

  Verify by reading the section back: it names both constants, `ownedPage` and `copiesOf`.
- [x] 3.4 Confirm no other code needs the number:
  - `grep -rn "OFFER_SIDE_LIMIT" apps packages --include="*.ts" --include="*.tsx" | grep -v node_modules` lists only the uses in design.md Findings 1, plus `copiesOf`.
  - `grep -rnw "50" packages/api/src/services/offer packages/api/src/lib/offer-*.ts apps/web/src/features/offers --include="*.ts" --include="*.tsx" | grep -v "\.test\."` finds no 50 that means the side limit. The hits are `OFFER_VIEWS_LIMIT`, opacity and ring classes.

  Then `bun run check` and `bun run build --filter=web` pass.

## 4. The web app: strings, tests and docs

- [x] 4.1 Strings: confirm none changes. `grep -n '"offer_refused_too_many"\|"offer_side_count"\|"offer_picker_count"\|"offer_picker_side_total"\|"offer_matches_capped_give"\|"offer_matches_capped_get"' apps/web/messages/{en,ko,ja}.json` shows each in all three locales with `{max}` and no literal number. Edit no message file. Discord output, the CSV export and the changelog have no offer text, and stay English in any case.
- [x] 4.2 Run the web tests that derive from the constant: `cd apps/web && bun run paraglide:compile && bun test src/features/offers`.
  - `builder/draft.test.ts` (`OFFER_SIDE_LIMIT`, `OFFER_SIDE_LIMIT + 1`) and `refusal.test.ts` pass unchanged.
  - The literal `50` room arguments in `copy-groups.test.ts`, `quantity.test.ts` and `near-picks.test.ts` stay as they are.
  - Three cases in `copy-groups.test.ts` read the limit through `dialogRoom` and `dialogFooter` and held 50 in their expected numbers: they now derive them from `OFFER_SIDE_LIMIT` (found during the build; this file joins the list in 6.1).
- [x] 4.3 `apps/web/docs/offers.md`:
  - In Offer builder, after the sentence "`SideColumn` draws `byCollection(picks)`…", add one sentence: the sides draw every pick, unvirtualised, so from `lg` the page holds up to twice `OFFER_SIDE_LIMIT` tiles.
  - In Trade page, add one sentence: The exchange (`trade-exchange.tsx`, `exchange-group.tsx`) draws every leg, with both sides rendered at every width, so a trade holds up to twice `OFFER_SIDE_LIMIT` tiles; virtualise both grids before the limit rises again.

  Verify by reading both sections back. Then `bun run check` and `bun run build --filter=web` pass.

## 5. Browser pass on the local stack

**Setup.**
- Start the local stack:
  - `docker compose --env-file .env --env-file .env.local up -d` brings up the local Postgres, Valkey and Centrifugo.
  - Keep `.env.local` in place. Confirm it sets `DATABASE_URL` (local), `INDEXER_DATABASE_URL` (production, read-only) and `REDIS_URL` (local) with `grep -c '^REDIS_URL=\|^DATABASE_URL=\|^INDEXER_DATABASE_URL=' .env.local`, which should print 3.
  - Then run `bun run dev --filter=web`. The app is at http://localhost:3200.
- Drive the browser with the `browser-use` CLI (`browser-use <<'PY' … PY`). Rules:
  - **Browser.** It drives the dedicated automation Chrome (profile `~/.chrome-automation`, port 9333, `BU_CDP_URL=http://127.0.0.1:9333`).
    - If `curl -s http://127.0.0.1:9333/json/version` fails, start it with `open -na "Google Chrome" --args --user-data-dir="$HOME/.chrome-automation" --remote-debugging-port=9333`, then run `browser-use --reload`.
    - If a run asks for the "Allow remote debugging?" popup, set `BU_CDP_URL` in that shell. Never fall back to the everyday Chrome.
  - **Tabs.** Open and drive a tab of your own, by target id; other agents may hold the shared one. For a signed-out pass or another account, use an isolated context (`Target.createBrowserContext` + `Target.createTarget`). Leave the profile's cookies and storage as they are.
  - **Login.** Before submitting a login form, wait until the page has hydrated. A click before hydration does a native GET that puts the email and password in the URL, the history and the dev-server log. If a credential leaks anyway, delete the log that holds it and tell the owner to rotate it.
  - **Secrets.** Read passwords (`LOCAL_TEST1_PASSWORD` in `.env.local`) from the environment only. Never print them, or any database URL.

**Tasks.**

- [x] 5.1 Picker past 50 (no data written). Checked 2026-11-13 on the collection picker: "92 of 200 picked", "92 of 200 on this side"; with 197 other picks Select all checked exactly 3 rows; at 200 the full line shows and unpicked tiles do nothing; the builder read "200 of 200" with Send enabled.
  - Sign in as `localtest1@local.invalid` and open http://localhost:3200/trade/@0xac56ff8179c515066605d78cd546fb7a0910f75f/offer at 1440 px.
  - In You get's collection picker, fill the side past 50 through the serial dialogs' Select all.
  - Verify each of these, with a screenshot:
    - the picker footer reads "N of 200 picked", and a serial dialog's footer reads "N of 200 on this side";
    - at 200, the footer and the dialog read "This side is full. Remove one to pick another.", and an unpicked tile does nothing;
    - with 197 other picks, Select all in a collection's dialog checks exactly 3 rows;
    - after Done, the builder's You get reads "200 of 200";
    - the send hint is not "At most 200 objekts on each side.", and Send is enabled when nothing else blocks it.
  - Leave Send unclicked.
- [x] 5.2 Builder at full size (no data written). Measured 2026-11-13 (development build, 4x throttle, 400 tiles): removing one pick 592 to 728 ms at 1440 px and 864 ms at 390 px; opening a 33-copy serial dialog 264 to 312 ms; toggling a tile 120 to 160 ms; checking a row 112 to 144 ms. Over the 200 ms bar. The owner was told and chose to ship 200 now, with virtualising the builder's grids as a follow-up.
  - Keep You get at 200, and fill You give from localtest1's own objekts as far as they reach, up to 200. localtest1 is linked to a real address with doubles.
  - Turn on 4× CPU throttling (`Emulation.setCPUThrottlingRate` `{ rate: 4 }` through `browser-use`'s `cdp()`).
  - Watch `PerformanceObserver` `event` entries (`durationThreshold: 16`, `buffered: true`) while you remove one pick on You get and toggle one in the picker, at 1440 px and at 390 px.
  - Record the longest `duration` for each, and the tile count on the page.
  - If any of them is over 200 ms, stop here and report the numbers to the owner (design, Open Questions). Do not continue to 5.3 or group 6.
  - Leave Send unclicked.
- [x] 5.3 Trade page at 200 legs. Measured 2026-11-13 on local trade T-93 (offer O-306, localtest1 with localtest3, 400 legs; made with the owner's OK, accepted through `offer.accept` with a local session row for localtest3). Development build, 4x throttle: 400 tiles drawn 1.25 s after navigation, 9,515 DOM nodes; selecting a tile 584 to 1,080 ms in the grid and 432 to 520 ms in the list; Grid to List 1,640 to 2,016 ms; scrolling leaves no gaps. Over the bar, as 5.2; the owner chose to ship 200 with virtualising as a follow-up. The trade could not be cancelled through the app locally (`offer.cancelTrade` answers `indexer_behind`, since the local env has no chain RPC), so T-93 stays in progress in the local database.
  - First check the local database for a trade with at least 200 legs: run `select trade_id, count(*) from trade_leg group by 1 order by 2 desc limit 1` against the `.env.local` `DATABASE_URL`.
  - If none exists, ask the owner before creating one. It would write local data only: an offer from localtest1, accepted as `localtest3-noprofile`. That account has no password, so ask the owner how to sign in as it locally.
  - With their OK and a sign-in:
    - send the 5.2 offer, and accept it;
    - open the trade at `/trade/mine/<tradeId>`;
    - under the same 4× throttling, record the longest `event` duration when you select a leg tile, in the grid view and the list view, at 1440 px and at 390 px, plus the tile count.
  - If any of them is over 200 ms, stop and report as in 5.2.
  - Afterwards, cancel the local trade through the app. Report the offer and trade ids, so the owner can track the local fixtures.
- [x] 5.4 Counter with any-copy asks. Checked 2026-11-13 with local offer O-305 (localtest1 asking any serial of two collections on localtest2's hidden-serial list, then withdrawn): the counter sent one `offer.candidates` call with `copiesOf` naming both collections and no per-collection read, and both asks resolved to copies. The pass also found that Any serial ticked on a list that shows serials was swapped for a copy by `resolveGetAsks`; fixed so only an ask a link brought resolves.
  - If the 5.3 offer exists, open the 200-ask offer's Counter as `localtest3-noprofile`. Otherwise use any local offer to localtest1 whose You get holds an any-copy ask.
  - Confirm in the network panel that the builder sends one `offer.candidates` call with `copiesOf` for You give's asks, not one per collection, and that each ask resolves to the sender's copies.
  - Leave Send unclicked.
- [x] 5.5 Offer card in `/messages`. Checked 2026-11-13 in conversation 399: the expanded card shows 11 tiles and "+189" a side; "+189" opens "You give · 200" and "You get · 200", each listing 200 items, unvirtualised (312 and 392 ms to open, unthrottled).
  - Open the localtest1 conversation that holds the 5.3 offer. If 5.3 created none, skip this with a note.
  - Verify that each side over 12 shows 11 tiles and a "+N" tile, and that "+N" opens the sheet listing every item.
  - Then `bun run check` and `bun run build --filter=web` pass on the final tree.

## 6. Agent docs

- [x] 6.1 Check the root `AGENTS.md` and those of the touched packages (`packages/api/AGENTS.md`, `apps/web/AGENTS.md`).
  - The change alters no convention, trap or workflow written there. The invariant, the copies read and the grid sizes live in the two `docs/offers.md` files, which those `AGENTS.md` already point to. State in the report that no `AGENTS.md` changed.
  - Verify that `git status` shows changes only in these files, beside whatever the tree held before this change started:
    - `packages/api/src/schemas/offer.ts`
    - `packages/api/src/services/offer/picker/mine.ts`
    - `packages/api/src/lib/offer-prefill.test.ts`
    - `packages/api/docs/offers.md`
    - `apps/web/src/features/offers/queries.ts`
    - `apps/web/src/features/offers/builder/form.tsx`
    - `apps/web/src/features/offers/builder/draft.ts`
    - `apps/web/src/features/offers/builder/draft.test.ts`
    - `apps/web/docs/offers.md`
    - `apps/web/src/features/offers/copy-groups.test.ts`
    - `packages/api/src/services/offer/core.ts`

## Workflow follow-up

- Archive this change with `/opsx:archive raise-offer-side-limit` after the owner reviews the browser pass.
- Follow-ups recorded in design.md, Open Questions:
  - virtualising the two full grids, if 5.2 or 5.3 measured over the bar;
  - batching the verifier's per-leg statements, and `reservedIds` as `= ANY`;
  - correcting the spec's "first 6" on the offer card to the code's 12.
