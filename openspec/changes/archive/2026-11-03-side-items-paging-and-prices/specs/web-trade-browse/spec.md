## MODIFIED Requirements

### Requirement: Trade card
Each person in the feed SHALL be one row, a bordered card on the card surface, one row to a line at every width. A row holds:
- **Header**:
  - the avatar;
  - the name, headed as For you heads a partner (see `web-trade-for-you` Partner identity), linking to the profile, with the Discord and X badges the person chose to show, wrapping onto the next line when they don't fit. On Browse, the viewer's own row SHALL carry a muted "You" tag after the name;
  - the reputation line (see `web-verified-trades`), wrapping between its " · " segments rather than truncating, so its full text always shows;
  - for a signed-in viewer on another person's row, the header sentence, from the counts in Matches to the signed-in viewer, with A the "They have" count, B the "You have" count and M the mutual score. Beside the name, a chip: "You can swap M", tinted, when M is above zero; any other row has no chip. Under the reputation line, a muted line with "They have A you want" when A is above zero and "You have B they want" when B is above zero. With no count above zero the row SHALL show neither, so a row without them reads as no match. Each number SHALL be in monospace and stand out from the words, and the visible words SHALL be the accessible text;
  - on the reputation line, after it, muted: the number of the person's kept lists ("3 lists") and when their newest post was last bumped, or last changed if that is later;
  - the ⋯ menu, holding Copy link (their person page, see `web-trade-person-pages`), Hide, Block and Report for a signed-in viewer who is not the person; a signed-out visitor's menu holds Copy link alone. Copy link SHALL be disabled, saying why, for a person with no linked Cosmo profile.
- **Actions**: Message, then Make offer as the primary button, both for the row's lead post (see Message a post's owner and Make offer on a post). An account that doesn't take messages from the viewer shows "Not taking messages" in their place. The viewer's own row has no actions.
- **Posts**, under the header: each of the person's kept posts, in this order: posts with a list count above zero first, most matched collections first; then the rest, newest bump first. The first post in this order is the row's lead post. Each post shows:
  - its tags, which say what it takes (see Tag help);
  - a WTT post with both lists: the HAVE strip and the WANT strip side by side, sharing the width equally, with a ⇄ mark between them;
  - a post with one side (WTS, WTB, or half a pair): that one strip across the width;
  - a side with no related objekt or no entries: the muted line Filters describes, under the other strip, with no ⇄ mark;
  - its lists' descriptions, empty sides' included, in one muted block set off by a rule at its start edge, under all its sides: each clipped to eight lines, keeping the owner's line breaks. A text both lists of a pair share SHALL show once. When two different descriptions show, each SHALL lead with its side's role label in its list type's colour. Under all the sides, never under one strip, so a description never pushes one strip's thumbnails below the other's.
  - a ⋯ menu holding Copy link, which copies that post's page (see `web-trade-person-pages`) and is disabled, saying why, for a person with no linked Cosmo profile.
- **All lists**: the row SHALL show every post it holds.

**Strip**: a monospace role label in its list type's colour, then " · " and the list's name, truncated to one line, then the list's own count when above zero ("14 you want", "2 you have"), on a tinted chip in monospace; under a narrowing filter the label reads as Filters says. The label SHALL link to the list page, carrying the list's name in its title; the list's description sits under the post's sides (see Posts). The count SHALL sit beside the link, not in it, and activating it SHALL open a popover, "Matched with your lists", naming each of the viewer's lists that count was taken against, with its type and a link to it: on a want list the viewer's have and sale lists, on a have or sale list the viewer's want lists, as Compare with narrows them. Under a want list, it SHALL also name each rule the match went through, "via rule" with the rule's label and how many collections, on Browse as on For you (see Matched through your rules). Under it, one line of thumbnails 2.5rem wide with no caption, ringed objekts first. A strip SHALL never wrap: it shows as many thumbnails as fit its width, and when some don't fit, the last place holds a "+N" tile counting the copies not shown. On a narrowed strip that shows its count chip, which counts collections, the "+N" tile SHALL count the collections not shown instead, and "of N" the list's collections, as its sheet's All tab does, so they all read in one unit.

**All of a list.** Activating a strip's "+N" tile SHALL open a sheet of that one list, never of the person's other posts, sliding in from the end side at every width: the viewport less 3rem below `sm`, up to 48rem from `sm` up. Its title is the list's name and its description the list's type. When the list has a description, the sheet SHALL show it in full above the objekts, scrolling with them. It SHALL list the list's objekts in columns that follow its width, one per 112 px and at least three, as the objekt pickers lay theirs out, copies of a collection stacked into one card with their count, those that match the viewer ringed as the strip rings them and first, then newest; a rule's objekts stay on its tile. When any match, two tabs SHALL lead it, "N you want" (on a want list "N you have") and "All N", counting collections, with the matching tab open first; otherwise it shows the list alone. Every collection of the list SHALL be reachable by scrolling, however many it holds: the objekts load in pages as the viewer nears the end of those shown, and nothing is left for the list page to show. On a sale side, each card SHALL show its price under its art, as the list page shows it: one price when every priced copy of its stack agrees, the lowest and highest ("RM 10–RM 15") when they differ, "QYOP" when no copy is priced and one is QYOP, and otherwise "No price", muted. A card whose copies carry notes SHALL offer them behind the note button beside its price, each distinct note once. A have or want side's cards SHALL show no price or note. The rings follow For you's Compare with, the owner's own list rings nothing, and a signed-out visitor sees no rings or tabs. A want side's rules SHALL lead the sheet as the strip's RULE tiles, since its objekt counts leave them out. When the feed's filters or matching narrowed the strip, the sheet SHALL still show the whole list of objekts and say that those aren't filtered; the RULE tiles keep the strip's counts. The objekts SHALL load only when the sheet opens. Activating an objekt SHALL close the sheet and open the objekt view. The footer SHALL offer Open list, which goes to the list page, and Close.

From `@3xl` of the feed's width, the actions SHALL sit at the header's end and the posts SHALL be indented to start under the name. Narrower, the row SHALL stack: the header, each strip at full width with the ⇄ mark turned to point down, then the actions in one row, Make offer filling the remaining width. The strips SHALL still not wrap, and the page SHALL not scroll sideways. Every row SHALL have the same layout whatever the number of objekts.

#### Scenario: Person with several posts
- **WHEN** nuppotoz has three listed want posts, "WISHLIST" with 3 collections the viewer has, "S24 WISHLIST" and "Atom01 leftovers" with none, at 1280 px
- **THEN** one row shows nuppotoz's header reading "You have 3 they want" and "3 lists", then the WISHLIST strip reading "3 you have", then S24 WISHLIST, then Atom01 leftovers

#### Scenario: Same partner on both tabs
- **WHEN** the viewer sees rin.trades's row on Browse and on For you, and rin.trades has 4 collections the viewer wants and wants 2 of the viewer's
- **THEN** both rows show the name, reputation line and ⋯ in the same order and read "You can swap 2"

#### Scenario: Chip without a mutual score
- **WHEN** a person has 3 collections the viewer wants and wants none of the viewer's
- **THEN** their row reads "They have 3 you want", and a screen reader announces the same words

#### Scenario: Chip for the other way
- **WHEN** a person wants 1 collection on the viewer's bound have lists and has nothing the viewer wants
- **THEN** their row reads "You have 1 they want"

#### Scenario: No match
- **WHEN** a signed-in viewer sees mira's row, whose lists match nothing of the viewer's
- **THEN** the header shows no match sentence, only the list count and time, and no strip shows a count

#### Scenario: Want-only WTT post
- **WHEN** a want list on its own is open to swaps only and on Trade
- **THEN** its post in the person's row shows the WTT tag with "Swaps only, not buying" beside it, and one WANT strip

#### Scenario: Pair has no note
- **WHEN** a WTT post holds a have list and its linked want list
- **THEN** its tag shows with no "Swaps only" note

#### Scenario: Hide from a post
- **WHEN** a signed-in viewer opens the ⋯ menu on rin.trades's row
- **THEN** it offers Copy link, Hide, Block and Report, and Copy link copies `/trade/@rin.trades`

#### Scenario: Copy a post's link from the row
- **WHEN** a visitor chooses Copy link in the ⋯ menu of rin.trades's post anchored on "spares"
- **THEN** `/trade/@rin.trades/<spares slug>` is copied

#### Scenario: Desktop grid
- **WHEN** the viewer opens `/trade` at 1280 px with 10 people loaded
- **THEN** the people sit in 10 rows, one each, and the feed keeps loading more as it scrolls

#### Scenario: Pair side by side
- **WHEN** a person's WTT post holds a have list and its linked want list, at 1280 px
- **THEN** the HAVE strip and the WANT strip sit side by side with ⇄ between them, their labels on one line, under the header

#### Scenario: One row at desktop width
- **WHEN** a post's have side holds 27 objekts and its HAVE strip has room for 6 thumbnails
- **THEN** the strip shows 5 thumbnails and a "+22" tile on one line

#### Scenario: Ringed first
- **WHEN** a have list's first entries match nothing, and its 10th and 12th entries are on the viewer's want lists
- **THEN** its strip shows those 2 ringed thumbnails first, then the rest

#### Scenario: Short side
- **WHEN** a post's want side holds 2 objekts
- **THEN** its WANT strip shows both thumbnails and no "+N" tile, and the strip is as tall as a full one

#### Scenario: Resize
- **WHEN** the viewer widens the window so a strip has room for 3 more thumbnails
- **THEN** the strip shows 3 more and the "+N" count drops by 3

#### Scenario: Which of my lists matched
- **WHEN** a person's HAVE strip reads "2 you want", matched through the viewer's want lists "binary hunt" and "store hunt"
- **THEN** activating "2 you want" opens a popover titled "Matched with your lists" naming both, each tagged Want and linking to its list

#### Scenario: See all of a list
- **WHEN** at 390 px a person's HAVE strip holds 24 collections, 14 of them on the viewer's want lists, and shows 4 thumbnails then "+20"
- **THEN** activating "+20" opens a sheet from the end side titled with that list's name, its objekts in three columns, with tabs "14 you want", open first and all 14 ringed, and "All 24"

#### Scenario: See all of a list on a desktop
- **WHEN** at 1280 px a person's HAVE strip holds 40 collections and shows "+34"
- **THEN** activating "+34" opens a sheet from the end side, 48rem wide, its objekts in six columns, and the feed stays in view beside it

#### Scenario: A very long list
- **WHEN** a person's SALE strip holds 2,834 collections and the viewer opens its "+N"
- **THEN** the sheet reads "All 2,834" or shows no tabs, more objekts load as the viewer scrolls, the last collection can be reached, and no line sends the viewer to the list page for the rest

#### Scenario: Sale prices in the sheet
- **WHEN** a sale list in ringgit holds Lynn SCO three times, priced RM 10, RM 15 and QYOP, JiWoo SCO once at RM 8 with the note "nego", and Kaede SCO once with no price
- **THEN** its sheet shows Lynn SCO as one card with its count 3 and "RM 10–RM 15", JiWoo SCO with "RM 8" and a note button reading "nego", and Kaede SCO with a muted "No price"

#### Scenario: Only QYOP
- **WHEN** every copy of a sale side's Lynn SCO is QYOP
- **THEN** its card in the sheet reads "QYOP"

#### Scenario: No price on a have side
- **WHEN** the viewer opens a have list's "+N"
- **THEN** its cards show no price and no note button

#### Scenario: Descriptions under a pair
- **WHEN** at 1280 px a WTT post's have list "spares" has the description "dm for proofs" and its want list "binary hunt" has a ten-line description
- **THEN** the HAVE and WANT strips' thumbnails start on the same line, and under both strips the post's note block reads "HAVE dm for proofs", then "WANT" with the first eight lines of the other; the "+N" sheet of "binary hunt" shows all ten lines

#### Scenario: Nothing matches
- **WHEN** the viewer opens a strip's "+N" on a list none of whose objekts match them
- **THEN** the sheet shows the list's objekts with no tabs and no rings

#### Scenario: WTS post
- **WHEN** a person's WTS post's sale list holds 19 objekts
- **THEN** one SALE strip runs across the width, its thumbnails showing only their art, with no price caption

#### Scenario: Phone width
- **WHEN** Browse is shown at 390 px
- **THEN** each row stacks its header, its strips at full width with ⇄ pointing down between a pair, and the actions with Make offer filling the row, each strip stays one line ending in "+N", and the page doesn't scroll sideways

#### Scenario: New account on a phone
- **WHEN** at 390 px a person has no completed and no unfinished trades
- **THEN** their reputation shows as a small muted "New" tag, with nothing cut off

#### Scenario: Established account on a phone
- **WHEN** at 390 px a person has 5 verified trades, 50% positive, since March 2025
- **THEN** their row's reputation reads "5 verified · 50%", without "since Mar 2025", and their profile still shows it

#### Scenario: Long line wraps on a phone
- **WHEN** at 390 px a person's header sentence and reputation don't fit one line
- **THEN** each wraps onto further lines between words, and nothing is cut off

#### Scenario: Own post on Browse
- **WHEN** the viewer's have list "spares" is on Trade and they open `/trade`
- **THEN** their row shows "You" after their name, no header sentence, and no Message or Make offer

#### Scenario: One list
- **WHEN** a person's only post is a WTS post holding sale list "duplicates"
- **THEN** its SALE label reads "SALE · duplicates", links to the "duplicates" list page, and the header reads "1 list"

#### Scenario: Two lists
- **WHEN** a WTT post holds have list "spares" and want list "binary hunt"
- **THEN** its HAVE label names and links to "spares", its WANT label names and links to "binary hunt", and the header counts them as one list

#### Scenario: Twitter in the sheet
- **WHEN** rin.trades shows both Discord and Twitter
- **THEN** their row's header shows both badges after the name, as their profile does

#### Scenario: One-way post on For you
- **WHEN** on For you a person has 3 collections the viewer wants on have list "spares" and wants none of the viewer's
- **THEN** the row reads "They have 3 you want", and the spares strip reads "3 you want" with those 3 ringed

#### Scenario: Mutual post on For you
- **WHEN** on For you a person has a mutual score of 2 with the viewer
- **THEN** the chip beside the name reads "You can swap 2" on an indigo tint
