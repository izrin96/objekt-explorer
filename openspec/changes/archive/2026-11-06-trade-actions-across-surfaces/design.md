# Design

## Context

See proposal.md for the six gaps. Every file path below is under `apps/web/src/`, unless it starts with `packages/`. Line numbers are from the working tree on 2026-11-05, which includes the user's uncommitted trade edits.

- **The post menu.** `features/trade/post-block.tsx:148-191` builds it: Make offer on this post (`:164-172`), Show all (`:173-183`) and Copy link (`:184-189`).
  - `offersHere` (`:84`) needs an open contact, an anchor and an `offerHandle`.
  - `openNear` (`:86-94`) adds the trade context only for near matches.
- **The row.** In `features/trade/person-row-view.tsx`, `contact` (`:86-94`) sets the card to the lead post, `actions` is at `:126-134`, and the row menus are at `:181-213`.
- **Make offer without a handle.** `features/trade/trade-actions.tsx:39` drops Make offer when `handle` is null. `offerHandleOf` returns null for a person with no linked profile (`features/trade/person-page.ts:23-29`).
- **The owner's pages.** In `features/trade/person-page-view.tsx`:
  - `own` comes from `row` (`:80`), so a null row hides who the owner is.
  - The empty state is at `:115-120`.
  - Owner actions are passed only with `focused` (`:132-136`).
  - `OwnPostActions` (`:184-211`) has Edit, Copy link and Take off, but no Bump.
- **Your posts.** The entry menu is at `features/trade/my-posts.tsx:294-319`. `linkReason` is at `:214-228`. The disabled-but-focusable button pattern is at `:138-158`.
- **The "+N" sheet.** Its footer is at `features/trade/side-items-sheet.tsx:273-278`. It is reached only through `SideAllDialog` (`features/trade/post-side.tsx:441-482`), which only `PostBlock` mounts.
- **The row name.** `features/trade/trade-header.tsx:60-70` links it to the profile through `ProfileLink`, with its hover card.
- **The On Trade badge.** It links to `/trade` in `features/list/list-header.tsx:88` and `features/list/list-rows.tsx:240`.
- **The objekt view.** `ObjektDrawer` already takes a `note` (`features/objekt/drawer/index.tsx:62`, rendered at `:253`). `browse-view.tsx:414-427` and `person-page-view.tsx:145-158` fill it with `NearNote`.

## Goals / Non-Goals

**Goals:**
- Use the components and stores that already exist.
- Change nothing under `features/objekt/drawer/`.
- Change no API input or output and no cache key.

**Non-Goals:**
- Offers to a person with no handle (decision 2).
- Starting an offer from a want-strip objekt (decision 5).
- Restyling the existing menus.

## Decisions

### 1. Message about this post goes through `useStartConversation`

- **How.** The post menu and the sheet footer call `useStartConversation()` (`features/chat/message-button.tsx:52-115`) with `{ kind: "list", slug: anchor.list.slug }`. The card is `{ kind: "post", listSlug: anchor.list.slug, withMatch }`, where `withMatch` is true when one of this post's strips counts a match. This is the same test `makeOffer` uses (`post-block.tsx:99-101`).
- **Where the hook lives.** It is called in `PostBlock`, not in the menu item. Base UI unmounts the popup on click, and the start mutation must outlive it. The menu item can't be a `MessageButton`, which is a button and not a `MenuItem`.
- **Trade-off.** The server saves the person-wide match (`personMatch`, see `packages/api/AGENTS.md`, Chat cards). So a post card carrying a match shows the person's counts, not only this post's. The gate keeps a card from showing a match for a post that has none. Per-post match counts on the server would change the card's stored shape, and that is out of scope.
- **Gating.** It is left out wherever `contact.kind !== "open"`, which covers Not taking messages, the viewer's own posts and posts with no anchor. `useStartGate` covers signed-out viewers.

### 2. With no handle, Make offer is disabled with its reason, not addressed by user id

- **Why the offer can't go through.** An account with no linked profile has no handle and no page.
  - Spec: `web-trade-person-pages` Trade handle.
  - API: `trade.person` throws NOT_FOUND (`packages/api/src/services/trade/person.ts:50-51`).
  - Route: the offer route reads `person` from that layout and renders nothing addressable without it (`routes/(container)/trade/@{$handle}/offer.tsx:42`).
- **Why it would be useless anyway.** Such an offer could be sent but never accepted. `createOffer` checks only the sender's address (`packages/api/src/services/offer/index.ts:103`), and `acceptOffer` refuses `no_address` when either party has none (`packages/api/src/services/offer/accept.ts:63`). Their You get would also be empty: an unbound list can only be a want list (`packages/api/src/schemas/list.ts:20-22`), and the collection fallback reads linked addresses.
- **Alternative rejected.** Address the person by user id. `requestOf` already has a `{ kind: "user" }` branch (`features/offers/offer-link.ts:117`). Using it would still need a new route or an API change to `trade.person`, and it would give the person offers they can't accept. Showing the button disabled needs no route and tells the truth.
- **The row.** `TradeActions` takes the reason and renders Make offer as a focusable `aria-disabled` button. It gets an sr-only `aria-describedby` and a reason toast on activation, the pattern of `my-posts.tsx:138-158`.
- **The menus.** `CopyLinkItem` (`features/trade/copy-link-item.tsx:10-22`) becomes a general `ReasonItem` (icon, label, reason, and an `onClick` or a link). `CopyLinkItem` keeps its name as a thin wrapper, so its current callers don't change. The post menu's Make offer on this post, View post, View Trade page and Your posts' View post all use it.
- **Copy.** New key `trade_offer_no_profile` (see Strings).

### 3. Owner actions: Edit and Take off in the post menu; Bump stays per person

- **The post menu.** `PostBlock` renders an `OwnPostItems` child only when `own`. It holds Edit post (`useOpenComposer()(startForPost(planLists, slug))`, which passes the current href as `from`) and Take off Trade (`useTakeDownPost`, `features/trade/actions.ts:169-208`).
  - **Why a child.** `useTakeDownPost` also runs `usePlanLists` and `useSavePost`. A memoized `PersonRow` in the virtua feed renders every `PostBlock`, so those hooks should mount only for the owner's posts.
- **Bump.** Bump bumps every post (`web-trade-browse` Bump). In a post's menu it would read as bumping one post, so it stays a per-person control:
  - in Your posts (as now);
  - in the own row's actions on the person page (new);
  - in `OwnPostActions` on the post page (added).
  - It reads `myPostsOptions()` (`features/trade/queries.ts:44`) for `nextBumpAt`, only in owner-only components, and reuses `useBumpPost` (`actions.ts:114-131`) and `trade_bump_next`.
  - **Not on the Browse own row.** Your posts sits right above it with the same Bump.
- **Who the owner is.** `PersonPageView` takes the owner from `userId === user?.user.id` instead of from `row` (`:80`), so a null row still knows it's the owner's page.
- **The owner's empty state.** It branches on `trade.myPosts` through a pure `ownEmptyKind(posts)` in `features/trade/my-posts-summary.ts`, beside `summarizePosts`, tested. It takes the first that applies:
  - `none` → New post;
  - `blocked` (`tradeBlocked`) → the block text, with no Bump;
  - `idle` (nothing listed) → Bump and Open Your posts;
  - `empty` (listed but sold out) → Open Your posts.
  - While `myPosts` loads or fails, the page keeps today's generic empty state.
  - Open Your posts links to `/trade`, where the Your posts row is.

### 4. Links into person and post pages: added paths, the name unchanged

- **The row name stays a profile link.** `ProfileLink` (`trade-header.tsx:60-70`) is how every surface names a person (Market, chat, lists), with the hover card. Pointing it at the Trade page only on Trade rows would make one name lead to two places. The file also holds the user's uncommitted edits.
- **What is added instead:**
  - View Trade page in the row's ⋯ menu, signed in (`SafetyMenu` `extraItems`) and signed out (`person-row-view.tsx:181-213`), left out when `page` is set without `focus` (the person page itself);
  - View post in each post's menu, left out on that post's page (`focused`);
  - View post in each Your posts entry, disabled by the same `linkReason`.
- **No preload.** Every new link to `/trade/@…` sets `preload={false}`. A person or post page loader reads the row against the feed's rate limit, which is why `features/chat/thread/post-card-message.tsx:97-98` and `features/offers/make-offer-button.tsx:49-50` already set it.
- **The On Trade badge.** A pure `tradePostLink(list)` in `features/list/list-link.ts`, tested in a new `list-link.test.ts`, returns `{ to: "/trade/@{$handle}/$slug", params }`:
  - the handle is `list.profileAddress`, else `list.linkedList.profileAddress`, lower-cased;
  - otherwise it returns null, and the badge keeps `/trade`.
  - The person layout redirects an address to the canonical handle, and a want half to its anchor slug (`web-trade-person-pages` Canonical address), so no handle is needed client-side. `PublicList` carries no handle or user id.
  - It lives in `features/list`, with no import from `features/trade`: `list-rows.tsx` is outside the feature-order exception (`apps/web/AGENTS.md` Feature order).

### 5. Offer from one objekt: a trade-owned note in the drawer's `note` slot

- **Carrying the context.** `OpenObjekt` (`features/trade/near.ts:21`) gains an optional third argument, `ask?: () => void`. `PostBlock` wraps `onOpen` per strip. For a have or sale strip on a post where `offersHere` holds, it passes `ask`, which calls `openOffer` with:
  - `to: { list: anchor }`;
  - `startList: side.list.slug`;
  - `ask: { collectionSlug, objektId: null, serial: null }`.

  This is how Market builds its start (`features/objekt/drawer/market-listing.ts:29-39`), but with no copy named. `browse-view.tsx` and `person-page-view.tsx` keep `ask` in their opened state, and render a new `ObjektOfferNote` (`features/trade/objekt-offer-note.tsx`) as `note` when there is no near match. `NearNote` wins, since it carries its own Make offer.
- **No copy is named, by design.** The feed's collections are read by slug (`packages/api/src/services/trade/feed/people.ts:193-194`), so a strip tile knows no copy. Adding objekt ids would change `FeedEntry` and its `trade:post:4` cache, and could leak ids from hide-serial lists.
- **A bare any-copy ask fails on most lists.** `matchEntry` (`packages/api/src/lib/offer-rules.ts:538-546`, through `entryObjektId` at `:535`) matches an any-copy item only to a collection entry or a hide-serial entry. A have list naming copies would be refused `not_listed` at send. That is why Market passes a copy.
- **So the builder resolves the ask, like a counter's any-copy give asks.** The form already loads the whole theirs list (`theirCandidatesOptions`, `features/offers/builder/form.tsx:106`). Without an offset that read is uncapped (`packages/api/src/services/offer/picker/index.ts:73-79`), and it resolves give-side any-copy asks with `resolveAsks` (`features/offers/builder/draft.ts:165`). A new pure `resolveGetAsks(get, items)` beside it, tested in `draft.test.ts`, runs on each get pick that has `objektId === null`. It looks at items on the pick's `listSlug` with the same `collectionSlug`, in this order:
  - an any-copy item → keep the ask;
  - else the first copy whose `blockedReason` is null → that copy, with `replaces: ask.key`;
  - else leave the ask, which `pickProblem` shows as one that can't be sent.

  `holdsDraft` keeps comparing the unresolved prefill, as the give side does. Market's asks either name a copy (no resolution) or come from hide-serial listings (resolved to any copy), so Market behaves as before. Resolving happens on the page, never on a preload. No API change.
- **Want strips are left out.** An `ask` only fills You get (`offer-link.ts:97-110`). Giving from a want strip would need the sender's picks in the URL, which Offer page address forbids.
- **The drawer overlap.** No file under `features/objekt/drawer/` changes. The note goes through the existing `note` prop.

### 6. "+N" sheet actions through a footer slot

`SideItemsSheet` gains an optional `actions?: ReactNode`, rendered first in `SheetFooter`, which wraps (`flex-wrap`). `SideAllDialog` passes it through. `PostBlock` passes Message about this post and Make offer on this post. Both close the sheet first (`onOpenChange(false)`), then run the same handlers the menu runs. Make offer on this post shows disabled with its reason where decision 2 applies. The composer doesn't use this sheet, so nothing changes there.

### Strings (en / ja / ko)

| key | en | ja | ko |
| --- | --- | --- | --- |
| `trade_post_message` | Message about this post | この投稿についてメッセージ | 이 게시물로 메시지 보내기 |
| `trade_offer_no_profile` | {name} hasn't linked a Cosmo profile, so offers can't reach them yet. | {name}さんはCosmoプロフィールを連携していないため、まだオファーを送れません。 | {name}님이 Cosmo 프로필을 연결하지 않아 아직 제안을 보낼 수 없습니다. |
| `trade_person_view_page` | View Trade page | 取引ページを見る | 거래 페이지 보기 |
| `trade_post_view` | View post | 投稿を見る | 게시물 보기 |
| `trade_objekt_offer` | Make offer for this objekt | このObjektにオファーする | 이 오브젝트에 제안하기 |
| `trade_objekt_offer_hint` | Asks {name} for it from {list}. | {name}さんの{list}から求めるオファーを作ります。 | {name}님의 {list}에서 요청하는 제안을 만듭니다. |
| `trade_own_idle_title` | Your posts are idle | あなたの投稿は休止中です | 내 게시물이 휴면 상태입니다 |
| `trade_own_idle_hint` | No bump or change in 30 days, so Browse hides them until you bump. | 30日間バンプも変更もないため、バンプするまで表示されません。 | 30일 동안 끌어올리거나 수정하지 않아 끌어올릴 때까지 숨겨집니다. |
| `trade_own_blocked_title` | Your posts are hidden from Trade | あなたの投稿は取引に表示されていません | 내 게시물이 거래에 표시되지 않습니다 |
| `trade_own_empty_title` | Nothing of yours shows on Trade | 取引に表示される投稿がありません | 거래에 표시되는 내 게시물이 없습니다 |
| `trade_own_empty_hint` | Your listed posts have nothing left to show. Edit them in Your posts. | 出している投稿に表示できるObjektが残っていません。「あなたの投稿」で編集してください。 | 올린 게시물에 표시할 오브젝트가 남아 있지 않습니다. 내 게시물에서 편집하세요. |
| `trade_own_open_posts` | Open Your posts | 「あなたの投稿」を開く | 내 게시물 열기 |

Reused keys:
- `trade_my_posts_empty_title` and `trade_my_posts_empty_hint`, for no posts;
- `trade_post_copy_link_blocked`, as the block hint;
- `trade_bump` and `trade_bump_next`;
- `trade_composer_edit_title` and `trade_take_off`;
- `trade_post_make_offer`.

The ko strings use 합니다체, as the file does. None of them is a question, so none needs ja's full-width ？.

## Risks / Trade-offs

- **[Risk]** A list's `profileAddress` may since have moved to another account, so the badge lands on someone else's page. → That page says the post is no longer on Trade (`web-trade-person-pages` Post no longer on Trade), the same as for an idle post. Accepted.
- **[Risk]** The whole theirs list is large for a long list. → The form already loads it today. Resolution only reads it.
- **[Risk]** A copy named on two of the partner's lists carries the first entry's `listSlug` only (`packages/api/src/services/offer/picker/theirs.ts:93-98`, the `seen` dedup). If the post's list is the second, `resolveGetAsks` finds no copy there, and the ask shows as one that can't be sent. → Accepted. Resolution stays on the post's own list, matching Make offer from a post, which asks only from that post's list. The sender can remove the pick and choose the copy from All their lists.
- **[Risk]** Your posts' bump and the page's Bump share `myPosts` and `useBumpPost`'s invalidation. → One source, so both show the same next bump.
- **[Trade-off]** On a post page, Edit post and Take off Trade show both as row buttons and in the post's menu. This matches how Make offer already shows on the row and in the post's menu.
- **[Risk]** Overlap with uncommitted work. `person-page-view.tsx`, `my-posts.tsx`, `actions.ts`, `browse-view.tsx`, `trade-header.tsx` and `messages/*.json` hold the user's in-progress trade edits. → Build on the working tree, and change only the lines named in tasks.md.
- **[Risk]** Pending change `trade-active-hours` plans byline edits in Trade rows. → It shares no requirement header with this change.
