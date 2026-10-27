# Design

## Context

See proposal.md for why. Today:

- A person row's counts come from `personMatches` (`services/trade-matches/person.ts`), which runs `recountPartners` over the viewer's sides: all their lists, or the sides `resolveCompareSides(viewer, list, mode === "mutual")` gives under Compare with. Each match carries `slug`, `myListIds`, `partnerListIds` and `trade` (false when only a sale list makes it).
- `offer.suggest` (`suggestOffer`, `services/offer/picker/index.ts`) predates that pipeline. It reads the viewer's want slugs and the partner's discoverable want slugs on its own, and takes the first sendable copy per collection. No web code calls it: the person sheet that did was dropped in 4a570c0b, and the leftover web wiring (`suggestFor`, `BuilderLoader`, `suggestOptions`) was removed in a5d5a16d.
- `BuilderForm` (`builder/form.tsx`) seeds its state once from `request.prefill`, and `holdsDraft` compares the picks against that prefill. It is keyed by the session, and it renders its own `BuilderHeader`, as `BuilderRefused` does.
- `big-trade-layouts` has shipped: each side's blocked-picks banner (`role="status"`, Remove them) is drawn inside `builder/side-column.tsx`, under that side's Add button.
- The thread's Make offer opens `{ to: { conversationId }, name }`. The thread page's conversation carries no `context` (only an inbox row does), but its messages carry their cards, so the newest card is the newest loaded message with one.
- `MakeOfferButton` runs `useStartGate().gate()` (`features/chat/message-button`) before it opens a builder, so a signed-out visitor is sent to sign in first.
- `WithNumber` (`features/trade/match-summary.tsx`) sets one number of a message in mono; it is private to that file.

## Goals / Non-Goals

**Goals:**
- What's added is exactly what the row counts, through one matching pipeline.
- The copy choice is a pure function with tests.

**Non-Goals:**
- Caching the read. It runs once per builder open and is rate-limited with the picker (`limitPicker`).
- Marking the added picks on their tiles.

## Decisions

1. **Rebuild `suggestOffer` on `recountPartners`.** Resolve the sides as Browse does (`resolveCompareSides(me, list, mutual)`), then call `recountPartners(me, sides, "all", { ownerIds: [partnerId] })` and keep every match, swaps and sales alike, so the builder adds what the row counts. Each match names the lists on both sides, so the candidates are narrowed to entries on those lists.
   - **Give:** the viewer's items on the match's `myListIds`.
   - **Get:** `theirCandidates` items whose `listSlug` belongs to the match's `partnerListIds`.

   The input becomes `{ partnerId, list?: string, mutual?: boolean, post?: string }`. All the new fields are optional, so the old shape still validates. `post` is the slug of a list of the partner's, and the server resolves the post as that list plus its `linkedListId` partner. Then:
   - get matches are kept only when their `partnerListIds` hold the post's have or sale list;
   - give matches only when they hold the post's want list.

   The output carries, per side, the picks and `matched`, the number of eligible matches before the cap, so the line can say when more matched than were added. With `post`, it also carries the post's list name for the line. A `post` that isn't the partner's or isn't on Trade gives no matches, not an error. The safety checks it already has (blocks, trade blocks, a partner taking no messages) stay.
   *Alternative:* keep the current `suggestOffer` logic. Rejected: it counts its own way (every want list against discoverable wants, with no Open to or swap rule), so it would add things the row never counted.

2. **Pure `chooseMatchPicks`** in `packages/api/src/lib/offer-prefill.ts`. It takes the candidate items per slug for each side and returns one item per slug, up to `OFFER_SIDE_LIMIT`, in the order the matches came, with each side's `matched` count:
   - **Give:** the highest serial with `transferable && !reserved`, preferring an empty `inOpenOffer`.
   - **Get:** an any-copy item (`objektId === null`) if one exists, with count 1. Otherwise the lowest serial with `transferable && !reserved`.
   - A slug with no eligible item drops out, and isn't counted in `matched`.

   Tests go in `offer-prefill.test.ts`.

3. **One status region in `offer-builder.tsx`.** `OfferRequest` gains `matches?: { partnerId: string; list?: string; mutual?: boolean; post?: string }`. When it's set, a `MatchesBuilder` in `offer-builder.tsx` reads `offer.suggest` (`staleTime: "static"`, so no refetch replaces picks under an open form, and `gcTime: 0`, so every open is fresh) and owns the frame:
   - It renders `BuilderHeader`, then one `role="status"` region, then the body. The region stays mounted from the first frame to the close, so a screen reader hears each change in one place. It is a plain element in the progress or warning tone (`lib/tone.ts`), never the vendored `Alert`, which is `role="alert"`.
   - While the read is pending, the region reads "Adding your matches…", the body is a skeleton per side, and the footer shows Cancel only: no hint ("Add at least one objekt…") and no Send.
   - When it ends, it renders `BuilderForm` with `prefill` built from the result through `toPick`, `added` (the added keys, the counts and the post's list name), and `header={false}`, since the header is already drawn, and `region`, the region's element, which `MatchesBuilder` keeps through a callback ref. `BuilderForm` renders the line into it with `createPortal`, so the line commits with the form and the region stays one node. Lifting the line as state set from the form's effect was rejected: it leaves the region empty for a commit and re-fires on every new node.
   - A failed read renders `BuilderForm` empty, and the region reads the failure in the warning tone.
   - A refusal from `theirCandidates` still renders `BuilderRefused`, without its header and with the region empty.
   - `DialogPopup` takes `initialFocus` on the title, so focus doesn't land on a skeleton or on Remove matches.

   This brings back the shape of the removed `BuilderLoader` rather than inventing a new one. A request without `matches` renders `BuilderForm` as today, with its own header and no region.
   *Alternative:* open the form at once and merge the matches in when they arrive. Rejected: picks the sender makes in the meantime would race the merge.
   *Alternative:* the region inside `BuilderForm`. Rejected: the form mounts only after the read, so the region would remount between "Adding your matches…" and the line.

4. **The line, Remove matches and Undo live in `BuilderForm`.** `added` holds the keys of the picks the matches added and the counts, which are fixed when the builder opens.
   - The line is ink in the progress tone on a progress tint (`TONE_FILL`/`TONE_EDGE` progress), led by `ArrowsLeftRightIcon` as `MatchChip` is, with its numbers in mono. `WithNumber` moves from `match-summary.tsx` to `features/trade/with-number.tsx`, exported, and takes several numbers (`{ give, get }`), so `MatchChip`, `MatchCounts` and the line share it. The failure uses the warning tone. Neither uses `accent`.
   - **Remove matches** takes out every added pick still there through the existing `takeOut`, so a resolved any-copy pick goes with its placeholder, and keeps the picks the sender added. The line keeps its slot and reads "Took out {count} matches" with **Undo** (`m.common_actions_undo()`), where `{count}` is how many it took out. Focus moves to Undo.
   - **Undo** puts back the picks Remove matches took out, skipping any key the side already holds, and the line reads as it did when the builder opened. Focus moves to Remove matches.
   - The "Added…" line goes once none of the added picks remain, when the sender removed them one by one. "Took out…" stays until Undo or the close.
   - The cap: when a side's `matched` is over 50, the line adds "Only 50 of the {count} that matched fit on You give." (or You get) after its first sentence.
   - `holdsDraft` is false when the draft is empty (nothing on either side, no top-up amount and no note), so closing an empty builder asks nothing, including after Remove matches. Otherwise it compares against the prefill, as today.

   The line sits above the sides, in the region. The blocked-picks banner sits inside each side, so the two never compete for one slot.

5. **Callers.**
   - `TradeActions` takes an optional `matches`. `PersonRowView` passes `{ partnerId, list, mutual }` when the row has a band, which it has whenever a match runs either way, taking `list` and the mode from `SideCompareContext`, which the feed derives from the route search.
   - The thread passes `{ partnerId: partner.userId, post }` when the newest loaded message's card is the partner's post card and its view carries a match, with `post` set to the card's list slug and `startList` to it when the post has a have or sale side.
   - The Market drawer and `counterRequest` are unchanged.

6. **A ⋯ menu per post, in `PostBlock`.** It's the vendored `Menu`, the same one `SafetyMenu` and My posts use.
   - **Trigger:** a `Button` with `variant="ghost"` and `size="icon-sm"`, in an `auto` column of the post's `FramePanel` grid beside `TradeSides`, never inside a strip's `<h3>`. Its name is "More actions for the post {list}", where `{list}` is the post's own list (the have list of a pair).
   - **Make offer on this post** (`HandshakeIcon`, as Make offer uses) runs the same `useStartGate().gate()` as `MakeOfferButton`, then opens the shared builder (`useSharedOfferBuilder`, already above the virtualised feed) with:
     - `to: { target: { kind: "list", slug } }`;
     - `startList` set to the post's have or sale list;
     - `matches: { partnerId, list, mutual, post }` only when one of its strip counts is above zero; with none it opens with no loader and no region, as an empty builder.

     It shows only where `TradeActions` shows Make offer, so `PostBlock` takes the row's `contact`. It shows on a row's only post too, though the row's Make offer does the same there, so every row's menu reads alike.
   - **Show all of {list}** opens a strip's `SideItemsDialog`, one item per strip. The dialog's open state (`allOpen`, `allMounted`) moves from `SideStrip` up to `PostBlock`, keyed by list id. That way the "+N" tile and the menu open the same dialog, and it keeps its lazy load.
   - The menu stays with only Show all on the viewer's own posts, and on rows not taking messages.
   - Focus returns to whatever opened the dialog: Base UI's Dialog returns it to the trigger, and for the menu path the dialog is given the menu button as its `finalFocus`.

   *Alternative:* one Make offer per strip. Rejected: a pair is one post, and its two strips would open the same offer.

7. **Messages.** A line with one count has a `_one` key, as en.json does ("1 list"). A line with two counts has none, as `list_add_copies_count` and `profile_count_summary` have none: no word in it changes with either count, in en, ko or ja. The numbers are `{give}`, `{get}` and `{count}`; the line picks its key by which sides were added and whether it names a post.

   | Key | en | ko | ja |
   | --- | --- | --- | --- |
   | `offer_matches_loading` | Adding your matches… | 매칭을 추가하는 중… | マッチを追加しています… |
   | `offer_matches_added` | Added {give} you give and {get} you get from your matches | 매칭에서 주는 것 {give}개, 받는 것 {get}개를 추가했습니다 | マッチから渡す{give}件、受け取る{get}件を追加しました |
   | `offer_matches_added_give` | Added {count} you give from your matches | 매칭에서 주는 것 {count}개를 추가했습니다 | マッチから渡す{count}件を追加しました |
   | `offer_matches_added_give_one` | Added 1 you give from your match | 매칭에서 주는 것 1개를 추가했습니다 | マッチから渡す1件を追加しました |
   | `offer_matches_added_get` | Added {count} you get from your matches | 매칭에서 받는 것 {count}개를 추가했습니다 | マッチから受け取る{count}件を追加しました |
   | `offer_matches_added_get_one` | Added 1 you get from your match | 매칭에서 받는 것 1개를 추가했습니다 | マッチから受け取る1件を追加しました |
   | `offer_matches_added_post` | Added from {list}: {give} you give and {get} you get | {list}에서 추가했습니다: 주는 것 {give}개, 받는 것 {get}개 | {list}から追加しました：渡す{give}件、受け取る{get}件 |
   | `offer_matches_added_post_give` | Added from {list}: {count} you give | {list}에서 추가했습니다: 주는 것 {count}개 | {list}から追加しました：渡す{count}件 |
   | `offer_matches_added_post_give_one` | Added from {list}: 1 you give | {list}에서 추가했습니다: 주는 것 1개 | {list}から追加しました：渡す1件 |
   | `offer_matches_added_post_get` | Added from {list}: {count} you get | {list}에서 추가했습니다: 받는 것 {count}개 | {list}から追加しました：受け取る{count}件 |
   | `offer_matches_added_post_get_one` | Added from {list}: 1 you get | {list}에서 추가했습니다: 받는 것 1개 | {list}から追加しました：受け取る1件 |
   | `offer_matches_capped_give` | Only {max} of the {count} that matched fit on You give. | 매칭된 {count}개 중 {max}개만 주는 쪽에 넣었습니다. | マッチした{count}件のうち、渡す側には{max}件だけ入れました。 |
   | `offer_matches_capped_get` | Only {max} of the {count} that matched fit on You get. | 매칭된 {count}개 중 {max}개만 받는 쪽에 넣었습니다. | マッチした{count}件のうち、受け取る側には{max}件だけ入れました。 |
   | `offer_matches_cleared` | Took out {count} matches | 매칭 {count}개를 뺐습니다 | マッチ{count}件を外しました |
   | `offer_matches_cleared_one` | Took out 1 match | 매칭 1개를 뺐습니다 | マッチ1件を外しました |
   | `offer_matches_remove` | Remove matches | 매칭 빼기 | マッチを外す |
   | `offer_matches_failed` | Couldn't add your matches. Add objekts below. | 매칭을 추가하지 못했습니다. 아래에서 오브젝트를 추가하세요. | マッチを追加できませんでした。下からObjektを追加してください。 |
   | `trade_post_menu` | More actions for the post {list} | {list} 게시물 더 보기 | 投稿「{list}」のその他の操作 |
   | `trade_post_make_offer` | Make offer on this post | 이 게시물에 제안하기 | この投稿にオファーする |
   | `trade_post_show_all` | Show all of {list} | {list} 모두 보기 | {list}をすべて表示 |

   Undo is `common_actions_undo` (실행 취소, 元に戻す). The ko strings follow ko.json: 제안 for offer, 매칭 for matches, 빼기 as in `offer_remove_them`, 게시물 for post, the formal -습니다 style, and 시리얼 무관 for an any-serial copy. The ja strings count with 件 as the trade strings do, and use 外す as `offer_remove_them` does.

## Risks / Trade-offs

- [The row's counts are cached up to 5 minutes, but the builder reads live] → the numbers can differ by what changed in between. The line states what was actually added.
- [A match through a sale list is added without its price] → no top-up is set; the sender adds one, as for a Market listing.
- [A partner with many lists makes the read heavy] → `theirCandidates` resolves the partner's whole list once, as opening You get's picker already does, and `limitPicker` caps the rate.
- [The ko line is the longest at 390 px] → it wraps inside the region (`text-pretty`) with Remove matches on its own line below, never past the sheet's edge.

## Migration Plan

No database change. Deploy the API with or before the web. No deployed web calls `offer.suggest`, so the new output harms nothing before the web ships. Rollback is the web alone: without `matches` the builder opens empty.
