## Why

The post composer is a two-step dialog of full-width list rows. Posts now need want-list rules and trade ratios too, and a dialog has no room for them: a rule form on top of the composer, and a ratio per objekt, don't fit. Most wants on Trade are wildcards ("any CC366"), and a rule is reached only from the want list's own page today. A prototype (2026-11-01, variant D) settled the shape: a page with a narrow settings column and a large preview of the post as Trade shows it, where rules and ratios are set on the post itself.

## What Changes

- New post and Edit post open a page, `/trade/new` (with `edit=<post>` for Edit post), in place of the dialog.
  - **Left column (settings):** Swap / Sell / Buy as one segmented choice with its description, each list as a dropdown (a list that can't be used shows disabled with the reason), "Also open to swaps", **+ New want list**, "I'd also pay…", and Post.
  - **Right side:** a preview of the post as Trade shows it: its tags, Has (or Selling) and Wants side by side, each with its list name and objekt thumbnails (23, then "+N"), the want list's rules, and who it matches.
- **Add rule** on the Wants side opens the existing rule form in a side sheet. The rule is saved to the list at once, and the page keeps its picks.
- **New want list** creates an empty want list with no profile, off Trade, and picks it.
- **Ratios** (from `trade-ratio`) are set on the preview:
  - "Ratio for all" by a side's list name;
  - tapping a thumbnail or a rule gives it its own;
  - "+N" opens every objekt of that side in the side sheet, to set the rest.
- Every place that opened the dialog navigates to the page instead, with the same picks: New post, Your posts' Edit post, the list form's Trade line (Post it, Edit post), "List created", and the near-match fix.
- Post returns to the page the viewer came from (Browse by default). Leaving without posting keeps whatever rules, lists and ratios were saved on the way.

Routes: `/trade/new` (new). New post on `/trade` and `/trade/for-you`, and the list page and list dialogs, now lead to it.

## Non-goals

- Pages for one person or one post (replacing `?person=`). This is a separate change, though `/trade/new` sits beside where they would live.
- Editing or deleting rules on the page; the list page's Rules strip keeps that.
- Holding rules, lists or ratios as a draft until Post: they save as they are made, as they do elsewhere.
- One list in several posts: "a list is in one post at a time" holds.
- Any change to what a post matches, to `trade.savePost`, or to the post rules in `planPost`.

## Depends on

`trade-ratio` (its data and API, and the chip). Build it first; this change adds the preview's ratio controls on top.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`: Post composer becomes a page (MODIFIED), plus new requirements for the page, its preview, rules, New want list and ratios in the preview.

## Impact

- Web (`apps/web`):
  - a new route `routes/(container)/trade/new.tsx`;
  - the composer moves from `features/trade/post-list-dialog.tsx` into page components, and the dialog and its `useComposer` go;
  - its callers (`browse-view.tsx`, `list-view.tsx`, `create-list-dialog.tsx`, `edit-list-dialog.tsx`, the near-match fix) navigate instead;
  - `RuleForm` (`features/list/rules/rule-dialog.tsx`) is exported for the side sheet;
  - new strings in en, ko and ja.
- Server: none beyond `trade-ratio`.
- The composer's pure modules (`composer-choice.ts`, `post-kind-text.ts`, `planPost`) are reused as they are.
