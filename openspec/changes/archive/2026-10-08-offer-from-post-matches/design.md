## Context

- `browse-post.tsx` opens the builder with `focusList: anchor.list.slug`. For a WTT pair the anchor is the have list, so the linked want list never reaches the builder. For a WTB post the anchor is the want list.
- `offer-builder.tsx` reads their whole list once (`theirCandidatesOptions`, `offer.candidates` side `theirs` with no offset), keeps the entries whose `listSlug` is `focusList`, cuts at `FOCUS_LIMIT` (8), and only then hides the ones already added. Their candidates come only from lists the sender may ask from (have and sale), so a want-list `focusList` yields nothing.
- `offer.candidates` side `mine` pages the sender's own objekts with `suggested` (entries on their bound have and sale lists) first, and narrows with `matchOnly` to collections on the partner's discoverable want lists (`wantSlugsOf(partner, true)`).

## Goals / Non-Goals

**Goals:**
- The two shortcuts in the spec delta, built on the existing candidates procedure and tiles.

**Non-Goals:**
- A new procedure, or any change to the pickers' own narrowing and paging.

## Decisions

**The post hands the builder both of its lists.** `OfferRequest.focusList` stays the have or sale side (`post.have ?? post.sale`). A new `focusWantList` carries `post.want`. A WTB post sets only `focusWantList`; a WTT pair sets both.

**Their side: the server names the matches.** The `theirs` response (whole-list form) gains `wanted: string[]`: the collections among their items that are on the sender's want lists (`wantSlugsOf(me, false)`). That is the same set the picker's "Only what I want" uses, so the shortcut and the picker agree. The builder orders the focus entries matched first, otherwise in list order. It removes added ones before cutting at 8, which gives the refill.
- Alternative rejected: passing the post's ringed objekts from the feed. The feed rings only the preview's 8 objekts, not the whole list.

**Mine side: narrow to one want list.** `pickerNarrowingSchema` gains `wantList?: string` for `side: "mine"`. It keeps collections on that list, which must be the partner's discoverable want list; otherwise the result is empty. The service resolves it like `matchOnly`, from one list's entries. The builder fetches the first page (`suggested` first, so bound have and sale entries lead) and shows the first 8 not already added. The shortcut adds a specific objekt as a give pick, exactly as the picker does.
- Alternative rejected: reusing `matchOnly`. It spans all of the partner's want lists, not the post's.

**One component.** The existing `FocusStrip` and `FocusStripSkeleton` render both shortcuts, with a label per side. The You give label is a new `m.*` key in en, ja and ko; You get keeps "From this post: select to add".

## Risks / Trade-offs

- [The You give shortcut reads only the first page of the viewer's objekts (200)] → a viewer with more than 200 matching objekts still gets 8 to choose from, and the picker narrows the rest.
- [An extra request when the builder opens from a post with a want side] → one call, the same procedure the You give picker already uses, cached for 30 seconds.
