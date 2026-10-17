# Proposal

## Why

The person sheet (All matches) is hard to read. It shows the person's name twice. Its thumbnails carry no caption, though the spec asks for one, so 201Z means nothing until it is tapped. Its two side-by-side columns leave half the sheet empty when the counts are lopsided. And the same counts appear three times: in the chip, in the column headings, and in Their matched lists. Separately, the reputation line on a Browse post's phone line truncates at 390 px, both "No verified trades yet" and "5 verified · 50% · since Mar 2025". We want both fixed before the Trade launch. The agreed look is the mockup at https://claude.ai/artifact/C83KATfEUcEbnTPkBuSsZM.

Routes: `/trade?person=<id>` and `/trade/for-you?person=<id>` (the sheet), and `/trade` and `/trade/for-you` (the phone line of each post).

## What Changes

- **One header.** The sheet's visible title is the Trade card header itself, so the name shows once. The reputation line in the sheet wraps instead of truncating. "updated <time ago>" and "ownership checked <time ago>" share one monospace line under it.
- **A summary replaces the match chip in the sheet:** three cells, Mutual M, A you want and B they want, numbers in monospace and in their direction's colour. The A and B cells jump to their sections. A post on Browse keeps its chip.
- **Stacked sections replace the two columns.** Each direction spans the sheet's full width, with captioned thumbnails (member, then collection number, in monospace).
- **Each section names its source lists.** Within a direction, the objekts are grouped by the person's list they came from, each group headed by the list's type and a link to it. This replaces the Their matched lists block. Not counted objekts follow the groups, as now.
- **Phones:** a section with more than two rows shows two rows, then a "+N" tile that shows the rest in place. Message and Make offer split the footer equally.
- **Browse phone line:** a compact reputation. An account with no completed and no unfinished trades shows a small "New" tag. Otherwise the line shows verified, unfinished (when above 0) and positive share, without "since <month>". Every other place keeps the full line.

## Non-goals

- No change to matching, counts or the person API. The sheet regroups data `trade.person` already returns (`partnerListIds`, `lists`).
- The match chip and its popover stay unchanged on Browse and For you posts.
- No change to the full reputation line outside the Browse phone line (profile, chat, trade page, the sheet's own header).
- No new strings beyond the summary labels, the "New" tag and the section's "from" and "for" list labels.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `web-trade-for-you`: the Person sheet requirement. Its layout, header, summary, sections grouped by list, captions, and phone behaviour.
- `web-trade-browse`: the Trade card requirement. The sheet no longer carries the chip, and the phone header line uses the compact reputation.

## Impact

- `apps/web/src/features/trade/person-sheet.tsx` (most of the change).
- `apps/web/src/features/trade/trade-header.tsx`: a way for the reputation line to wrap.
- `apps/web/src/features/offers/trust-line.tsx`: a compact variant.
- `apps/web/src/features/trade/browse-post.tsx`: the phone line uses the compact variant.
- `apps/web/messages/{en,ko,ja}.json`: new strings.
- `MatchedLists` and `MatchChip` remain for posts. The sheet stops importing them.
