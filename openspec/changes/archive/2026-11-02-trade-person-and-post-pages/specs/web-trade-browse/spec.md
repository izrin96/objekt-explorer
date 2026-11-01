## MODIFIED Requirements

### Requirement: Matches to the signed-in viewer
For a signed-in viewer, each person's row on Browse and on For you SHALL show that person's counts. They are taken across all of the person's listed have, sale and want lists (on Trade, not idle), with the rules and ownership check of `web-trade-for-you`. They are counted against the viewer's lists, or, on For you, against the lists Compare with names:
- "They have N you want": collections on the person's have or sale lists that are on one of the viewer's want lists that can take them. A have list, and a sale list open to swaps, count against a want list open to swaps (Swaps only, or Swaps or buying); every sale list counts against a want list open to buying (Swaps or buying, or Buying only).
- "You have N they want": collections on the person's want lists that are on one of the viewer's have or sale lists that is bound to a Cosmo profile and still tradeable by the viewer. A have list, and a sale list open to swaps, count for a want list open to swaps; every sale list counts for a want list open to buying.
- The mutual score: what the person and the viewer can swap within one post on each side. A post here is a linked pair: a have list, or a sale list open to swaps, and the want list linked to it, posted or not on the viewer's side. For each pairing of one of the viewer's posts with one of the person's posts there are two swap counts: the collections on the person's post's have list, or sale list open to swaps, that are on the viewer's post's want list when it is open to swaps (Swaps only, or Swaps or buying); and the collections on the person's post's want list, when it is open to swaps, that are on the viewer's post's have list, or sale list open to swaps, bound to a Cosmo profile and still tradeable by the viewer. A pairing scores the smaller of the two, and the person's mutual score is the highest score of any pairing. A list with no link, the person's or the viewer's, SHALL never count toward the mutual score, though it counts toward the two counts above. A sale list set to Sell only, the person's or the viewer's, SHALL never count toward the mutual score either: a sale is not a swap, so a person matched only through such lists is one way. A want list set to buying only never counts toward it.

The counts show once, in the row's header sentence (see Trade card). Each list in the row SHALL also show its own count, by the same rules, taken on that list alone: on a have or sale list the collections the viewer wants ("14 you want"), on a want list the collections the viewer has ("2 you have"). Matched objekts SHALL be marked with a ring, judged on the list's own objekts. There SHALL be no match chip, no popover of matched lists and no All matches control.

A person with a mutual score of zero SHALL read as one way, with no mark beside the name, whatever directions their counts run: whether the swaps cross posts, run through lists with no link, or one or both directions run only through sale lists set to Sell only or want lists set to buying only.

Matching SHALL use the viewer's have lists bound to a Cosmo profile, not everything their wallet holds, so an objekt the viewer keeps off their have lists never counts as offered.

**Matches prompt.** Browse has no Matches control. Beside its Post type menu:
- a signed-out visitor SHALL see one line inviting them to sign in to see which posts match their lists, with a Sign in link to `/login?redirect=/trade/for-you`;
- a signed-in viewer SHALL see no line there, whether or not they have a list that can match.

Browse SHALL list the viewer's own row, so they can see where a bump put them, with no header sentence and no list counts or rings. For you SHALL never list it. People the viewer hid SHALL be left out of both (see `web-trade-for-you` Hide a partner).

#### Scenario: Default
- **WHEN** a signed-in viewer with a want list opens `/trade` with no parameters
- **THEN** every person with a listed post is listed, with header sentences, list counts and rings, and no Matches or Compare with control shows

#### Scenario: Own post on Browse
- **WHEN** the viewer bumps and opens `/trade`
- **THEN** their row is listed at the top of Browse with no header sentence, and it is not listed on `/trade/for-you`

#### Scenario: Held but not on a have list
- **WHEN** the viewer holds SeoYeon 204Z but it is on none of their have lists, and a person's want list wants it
- **THEN** SeoYeon 204Z is not ringed or counted on that list or in that person's sentence

#### Scenario: Counts sit on their list
- **WHEN** nuppotoz has want lists "S24 WISHLIST", holding nothing the viewer has, and "WISHLIST", holding 3 collections on the viewer's bound have lists
- **THEN** nuppotoz's row reads "You have 3 they want", the WISHLIST strip reads "3 you have" with those 3 ringed and listed first, and the S24 WISHLIST strip shows no count

#### Scenario: Which lists matched
- **WHEN** a person's want list asks for two collections that are on the viewer's have list "spares"
- **THEN** that want list's strip reads "2 you have" with both ringed, and no popover or control names the viewer's lists

#### Scenario: Unlinked lists, one person
- **WHEN** rin.trades has a have list holding 1 collection the viewer wants and a separate want list, not linked to it, asking for 2 collections on the viewer's bound have lists, none of these on sale lists
- **THEN** rin.trades's row reads "They have 1 you want" and "You have 2 they want" with no Can swap mark, the have list reads "1 you want", the want list "2 you have", and rin.trades is listed under One way

#### Scenario: Swaps across the viewer's posts
- **WHEN** the viewer's post P1 pairs have list "jiwoo spares" with want list "doubles hunt", their post P2 pairs have list "yooyeon spares" with want list "hyerin and kaede", and mina.k's post holds 2 collections on "doubles hunt" and wants 1 collection on "yooyeon spares"
- **THEN** mina.k's row reads "They have 2 you want" and "You have 1 they want" with no Can swap mark, and mina.k is listed under One way, not Can swap

#### Scenario: A rule inside one post
- **WHEN** the viewer's post P1 pairs "jiwoo spares" with "doubles hunt", whose rule wants every Double, and rae.s's post holds a Double and wants a collection on "jiwoo spares"
- **THEN** rae.s's row reads "You can swap 1", and rae.s is listed under Can swap

#### Scenario: The viewer's unlinked want list
- **WHEN** the viewer's want list "wishlist" has no link, sora.p's post holds 1 collection on "wishlist" and wants 1 collection on the viewer's have list "jiwoo spares", whose post pairs it with "doubles hunt", which wants nothing sora.p has
- **THEN** sora.p's row reads "They have 1 you want" and "You have 1 they want" with no Can swap mark, and sora.p is listed under One way

#### Scenario: The person's posts are counted one at a time
- **WHEN** the viewer's single post pairs "spares" with "binary hunt", and rin.trades has two posts: the first holds 2 collections on "binary hunt" and wants nothing of the viewer's, the second holds nothing the viewer wants and wants 1 collection on "spares"
- **THEN** rin.trades has no Can swap mark and is listed under One way

#### Scenario: A sale list never makes a person mutual
- **WHEN** jinsoul.blue's sale list, set to Sell only, holds 3 collections on the viewer's want lists (open to swaps or buying), jinsoul.blue has no have list, and their want list asks for 1 collection on the viewer's bound have list
- **THEN** jinsoul.blue's row reads "You have 1 they want", the sale list reads "3 you want", and jinsoul.blue is listed under One way, not Mutual

#### Scenario: Sale listings aren't mutual
- **WHEN** jinsoul.blue's sale list, set to Sell only, holds 3 collections on the viewer's want list, which is open to swaps only, and their want list asks for 1 collection on the viewer's bound have list
- **THEN** the sale list does not count, so jinsoul.blue's row reads "You have 1 they want", the sale list shows no count, and jinsoul.blue is not listed under Mutual

#### Scenario: The viewer's sale list against their want list
- **WHEN** the viewer's sale list, set to Sell only, holds a collection that rin.trades's want list asks for, and rin.trades has a have list holding a collection the viewer wants
- **THEN** rin.trades is not Mutual through it, whatever that want list is open to; when it is open to buying, the collection counts in rin.trades's "You have N they want"

#### Scenario: A buying-only want list ignores have lists
- **WHEN** rin.trades's have list holds 2 collections on the viewer's want list, which is set to Buying only, and rin.trades has no sale list
- **THEN** rin.trades's row does not count them, rings none of those objekts, and rin.trades is not listed under Mutual

#### Scenario: Chips follow Compare with
- **WHEN** on For you, Compare with names have list "spares" linked to want list "binary hunt", and rin.trades has 2 collections on "binary hunt" and 1 on another of the viewer's want lists, and wants nothing of the viewer's
- **THEN** rin.trades's row reads "They have 2 you want", not 3

#### Scenario: Mutual partner
- **WHEN** the viewer opens `/trade?person=<rin.trades's id>` and rin.trades has 4 listed posts
- **THEN** the browser is at `/trade/@rin.trades`, showing rin.trades's row with all 4 posts

#### Scenario: Banner on a shared link
- **WHEN** a signed-in viewer opens `/trade?person=<nuppotoz's id>`
- **THEN** no banner shows on the feed: the browser is at nuppotoz's person page

#### Scenario: Signed-out banner
- **WHEN** a visitor without a session opens `/trade?person=<id>` for someone with listed posts
- **THEN** the browser is at that person's page, showing their row with no counts

#### Scenario: Person link to someone hidden
- **WHEN** the viewer opens `/trade?person=<id>` for a person they hid
- **THEN** the browser is at that person's page, which says they have nothing on Trade right now

#### Scenario: Person outside the artist selection
- **WHEN** a visitor with only ARTMS selected opens `/trade?person=<id>` for someone whose posts hold only tripleS objekts
- **THEN** the browser is at that person's page, showing every post

#### Scenario: Person with nothing listed
- **WHEN** a visitor opens `/trade?person=<id>` for someone whose posts are all idle
- **THEN** the browser is at that person's page, which says they have nothing on Trade right now

#### Scenario: Old link
- **WHEN** the viewer opens `/trade?match=mutual` from an older link
- **THEN** the browser is at `/trade/for-you?match=mutual` and Can swap is on

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade`
- **THEN** rows are listed with no header sentence, no list counts and no rings, and a line beside the Post type menu invites them to sign in to see matches, linking to `/login?redirect=/trade/for-you`

#### Scenario: No list that can match
- **WHEN** a signed-in viewer whose only list is a have list not bound to a Cosmo profile opens `/trade`
- **THEN** no line shows beside the Post type menu, and the For you tab is hidden

#### Scenario: Hidden partner
- **WHEN** the viewer hid rin.trades
- **THEN** rin.trades's row is not listed on Browse or For you for that viewer

#### Scenario: A have list and a want list both ways make a swap
- **WHEN** rin.trades's have list holds 2 collections on the viewer's want list open to swaps or buying, rin.trades's want list (open to swaps), linked to that have list, asks for 3 collections on the viewer's bound have list, which is linked to that want list, and rin.trades's sale list, set to Sell only, holds 4 more collections the viewer wants
- **THEN** rin.trades's row reads "You can swap 2", and rin.trades is listed under Mutual

#### Scenario: A sale list open to swaps makes a swap
- **WHEN** jinsoul.blue's sale list, open to swaps, holds 3 collections on the viewer's want list open to swaps only, and jinsoul.blue's want list (open to swaps), linked to that sale list, asks for 2 collections on the viewer's bound have list, which is linked to that want list
- **THEN** jinsoul.blue's row reads "You can swap 2", the sale list reads "3 you want", and jinsoul.blue is listed under Mutual

### Requirement: Your posts and Post a list
A signed-in viewer's posts SHALL be summarised above the feed in one row: the title Your posts, how many of them are listed, how many are idle, when the next bump is allowed while it is not, the one Bump control (see Bump), disabled until then, a Copy link control, a New post control that opens the post composer, and a control that shows or hides the posts. The row SHALL show on Browse; For you and a signed-out visitor SHALL keep a New post control above the feed in its place. Shown, each entry SHALL be one post and show:
- its tags and kind (Swap, Sell or Buy);
- each list with its role: Offering for a have list, Looking for for a want list, Selling for a sale list, each linking to its list page;
- the option it carries: "Would also pay" on a Swap post that would, "Also on Market" on a Sell post;
- whether the post is listed or idle, and when it was last changed;
- a menu with Edit post, Copy link and Take off Trade.

The row's Copy link SHALL copy the viewer's person page (see `web-trade-person-pages`), `/trade/@<their handle>`, and each entry's menu SHALL also hold Copy link, copying that post's page, `/trade/@<their handle>/<anchor slug>`; each confirms with "Link copied" and the copied address. The row's Copy link SHALL be disabled while none of the posts is listed, the viewer is under a trade block, or the viewer has no linked Cosmo profile and so no handle, staying focusable and saying which reason applies. An entry's Copy link SHALL be disabled in the same way while that post is idle, or for the same block or missing profile.

With no choice saved in this browser, the posts SHALL start shown when any of them is idle, and hidden otherwise. Showing or hiding them SHALL be remembered in this browser, and that choice SHALL win over the default. A viewer with no posts SHALL see the row say they have no posts on Trade, with New post. A signed-out visitor activating New post SHALL be sent to `/login?redirect=/trade`.

#### Scenario: New post on For you
- **WHEN** a signed-in viewer opens `/trade/for-you`
- **THEN** no Your posts row shows, and a New post control above the feed opens the composer

#### Scenario: Summary of six posts
- **WHEN** the viewer has six posts, one idle, and last bumped 2 days ago
- **THEN** the row reads Your posts with 5 listed and 1 idle, and its Bump control is enabled

#### Scenario: Bumped within the day
- **WHEN** the viewer has three posts and bumped an hour ago
- **THEN** the row reads Your posts with 3 listed and the next bump in 23 hours, and its Bump control is disabled

#### Scenario: Starts hidden when nothing is idle
- **WHEN** none of the viewer's posts is idle and they have never shown or hidden them
- **THEN** only the summary row is above the feed

#### Scenario: Starts shown when a post is idle
- **WHEN** one of the viewer's posts is idle and they have never shown or hidden them
- **THEN** the posts are listed under the summary row

#### Scenario: The choice is remembered
- **WHEN** the viewer hides the posts and later opens `/trade` again in the same browser, with a post now idle
- **THEN** the posts stay hidden, and the summary row still counts the idle post

#### Scenario: Post from the dialog
- **WHEN** the viewer activates New post and posts want list "binary hunt" as a Buy post
- **THEN** the list is on Trade and in matching, and appears under Your posts as bumped just now

#### Scenario: Unbound have list
- **WHEN** the viewer's have list is not filed under a Cosmo profile
- **THEN** it shows disabled in the composer New post opens, with the reason shown

#### Scenario: A Swap post entry
- **WHEN** the viewer's Swap post holds "spares" and "binary hunt" and would also pay
- **THEN** its entry shows WTT and WTB, Swap, Offering spares, Looking for binary hunt, and "Would also pay"

#### Scenario: Take down from the dialog
- **WHEN** the viewer chooses Take off Trade on a Sell post
- **THEN** the sale list leaves `/trade`, Market and For you

#### Scenario: Copy the link to all posts
- **WHEN** the viewer activates Copy link on the Your posts row with 3 listed posts
- **THEN** `/trade/@<their handle>` is copied, and opening it shows their row with the 3 posts

#### Scenario: Copy one post's link
- **WHEN** the viewer chooses Copy link in the menu of their listed Swap post anchored on "spares"
- **THEN** `/trade/@<their handle>/<spares slug>` is copied

#### Scenario: Copy link without a profile
- **WHEN** a viewer whose account links no Cosmo profile has a listed want post
- **THEN** the row's Copy link is disabled and says to link a Cosmo profile first

#### Scenario: Copy link under a trade block
- **WHEN** a viewer under a trade block opens Your posts
- **THEN** the row's Copy link is disabled and says a trade block hides their posts from Trade

#### Scenario: Copy link with every post idle
- **WHEN** every one of the viewer's posts is idle
- **THEN** the row's Copy link is disabled and says to bump first

#### Scenario: No posts
- **WHEN** a signed-in viewer has no posts
- **THEN** the row says they have no posts on Trade and offers New post

### Requirement: Trade card
Each person in the feed SHALL be one row, a bordered card on the card surface, one row to a line at every width. A row holds:
- **Header**:
  - the avatar;
  - the name, headed as For you heads a partner (see `web-trade-for-you` Partner identity), linking to the profile, with the Discord and X badges the person chose to show, wrapping onto the next line when they don't fit. On Browse, the viewer's own row SHALL carry a muted "You" tag after the name;
  - the reputation line (see `web-verified-trades`), on one line, truncated with an ellipsis when it doesn't fit, its full text available to assistive technology;
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

**Strip**: a monospace role label in its list type's colour, then " · " and the list's name, truncated to one line, then the list's own count when above zero ("14 you want", "2 you have"), on a tinted chip in monospace; under a narrowing filter the label reads as Filters says. The label SHALL link to the list page, carrying the list's name in its title; the list's description sits under the post's sides (see Posts). The count SHALL sit beside the link, not in it, and activating it SHALL open a popover, "Matched with your lists", naming each of the viewer's lists that count was taken against, with its type and a link to it: on a want list the viewer's have and sale lists, on a have or sale list the viewer's want lists, as Compare with narrows them. Under a want list, it SHALL also name each rule the match went through, "via rule" with the rule's label and how many collections, on Browse as on For you (see Matched through your rules). Under it, one line of thumbnails 2.5rem wide with no caption, ringed objekts first. A strip SHALL never wrap: it shows as many thumbnails as fit its width, and when some don't fit, the last place holds a "+N" tile counting the copies not shown. On a narrowed strip that shows its count chip, which counts collections, the "+N" tile SHALL count the collections not shown instead, and "of N" the list's collections, as its dialog's All tab does, so they all read in one unit.

**All of a list.** Activating a strip's "+N" tile SHALL open a dialog of that one list, never of the person's other posts: a bottom sheet below `sm`, a centred dialog from `sm` up. Its title is the list's name and its description the list's type. When the list has a description, the dialog SHALL show it in full above the objekts, scrolling with them. It SHALL list the list's objekts, copies of a collection stacked into one card with their count, those that match the viewer ringed as the strip rings them and first, then newest; a rule's objekts stay on its tile. When any match, two tabs SHALL lead it, "N you want" (on a want list "N you have") and "All N", counting collections, with the matching tab open first; otherwise it shows the list alone. Past 300 collections the rest are counted, "N more on the list page". The rings follow For you's Compare with, the owner's own list rings nothing, and a signed-out visitor sees no rings or tabs. A want side's rules SHALL lead the dialog as the strip's RULE tiles, since its objekt counts leave them out. When the feed's filters or matching narrowed the strip, the dialog SHALL still show the whole list of objekts and say that those aren't filtered; the RULE tiles keep the strip's counts. The objekts SHALL load only when the dialog opens. Activating an objekt SHALL close the dialog and open the objekt view. The footer SHALL offer Open list, which goes to the list page, and Close.

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
- **THEN** activating "+20" opens a bottom sheet titled with that list's name, with tabs "14 you want", open first and all 14 ringed, and "All 24"

#### Scenario: Descriptions under a pair
- **WHEN** at 1280 px a WTT post's have list "spares" has the description "dm for proofs" and its want list "binary hunt" has a ten-line description
- **THEN** the HAVE and WANT strips' thumbnails start on the same line, and under both strips the post's note block reads "HAVE dm for proofs", then "WANT" with the first eight lines of the other; the "+N" dialog of "binary hunt" shows all ten lines

#### Scenario: Nothing matches
- **WHEN** the viewer opens a strip's "+N" on a list none of whose objekts match them
- **THEN** the dialog shows the list's objekts with no tabs and no rings

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

### Requirement: Matches and Compare with
For you (`/trade/for-you`) SHALL list the same people as Browse, in the same rows and with the same Post type menu and facets, narrowed by matching. It SHALL carry a toggle button labelled Can swap, pressed or not (see Layout for where it sits). Not pressed is Any, the default; pressed is Mutual, which the viewer sees named Can swap, never Mutual; the URL keeps `match=mutual`:
- **Any**: only posts holding at least one objekt that matches the viewer are kept, judged on each post's own lists (see Filters), and only people with a kept post are listed, in two sections (see Any order).
- **Mutual**: only people whose mutual score is above zero, as the person's header sentence computes it (see Matches to the signed-in viewer). Of those people's posts, only those holding a match are kept, as under Any.

**Who sees it.** For you SHALL require a signed-in viewer with at least one list that takes part in Trade (a want list, or a have or sale list bound to a Cosmo profile):
- a signed-out visitor opening it SHALL be sent to `/login`, and back to the same For you address after signing in;
- a signed-in viewer without such a list SHALL be sent to `/trade`, keeping the filters, and dropping `match` and `list`.

**Post type menu.** On Browse and For you, the post type SHALL be one menu labelled Post type, offering All, WTT, WTB and WTS, with each tag spelled out ("WTT · Want to trade"). It replaces the Type tabs, so the controls beside it never move. Mutual is a swap between two people, and a WTB or WTS post is one-way money, so Mutual SHALL list WTT posts only: the menu SHALL read WTT with every other option disabled, a `type` in the URL or in a request SHALL be ignored, by the server as well as the page, and turning Can swap on SHALL drop it from the URL. Who counts as Mutual is unchanged (see Matches to the signed-in viewer).

**Default and URL.** The option SHALL live in the URL as `match`, with the values `any` and `mutual`. With no `match`, or a value that does not parse, Any SHALL apply. Browse's `type`, `slug` and facet parameters SHALL carry the same meaning on For you.

**Mutual order.** Under Mutual the feed SHALL list people best match first:
1. the mutual score;
2. then the sum of both counts;
3. then the most recent change to any of the person's matched lists.

Each person SHALL be one row holding their kept posts (see Trade card). Every Mutual person SHALL be listed, with no cap beyond the 1000 candidates matching reads, and idle posts SHALL not be listed (see Order and idle posts). The feed SHALL load 12 people at a time and continue after the last person it showed. When the ranking is worked out again between two loads, a person already shown SHALL not be listed again, and a person who only moved within the ranking since SHALL still be listed, at the place earlier loads saw them. A person who leaves Mutual between two loads MAY go unlisted until the feed is opened again.

**Any order.** Under Any the feed SHALL list two sections, in this order:
1. **Mutual**: exactly the people Mutual lists for the same filters and Compare with choice, in Mutual order. Each row SHALL hold all of the person's kept posts, in the Trade card's order. A person Mutual ranks who has no kept WTT post SHALL be listed under One way instead. With WTB or WTS picked in the Post type menu there is no Mutual section, since Mutual lists WTT posts only.
2. **One way**: every other person Any keeps. People SHALL be listed most matches first, by the sum of both counts and then the most recent change to any of their matched lists, among the people matching ranks (at most its 1000 candidates). After them comes anyone else Any keeps, by their newest bump. A person SHALL be listed in one section only.

Each section SHALL open with a heading, Can swap (for Mutual) or One way, with no count, over its first row. A section with no people SHALL have no heading. Under Can swap there SHALL be no section heading. The feed SHALL load 12 people at a time across the sections, continuing after the last person it showed, and SHALL not list a person twice when the ranking is worked out again between two loads. The empty states of Filters are unchanged.

**Description.** Under the tabs, For you's description SHALL read "People who match your lists, best match first." Below `md`, neither tab SHALL show its description.

**Mutual N.** The Can swap button SHALL read "Can swap N", pressed or not, N being how many people Mutual lists for the current Compare with choice: people with at least one matching WTT post, with no artist or collection filter applied, so N stays put while the viewer filters. A one-way list, which Mutual can't use, counts as All my lists:
- a count of zero SHALL show the label with no number;
- a count above 99 SHALL read "99+";
- N SHALL be in monospace, and the accessible name SHALL include it;
- N MAY be up to 5 minutes behind the people Mutual lists.

**Compare with.** For you SHALL always show a Compare with control. It offers All my lists and each of the viewer's have, sale and want lists that take part in Trade, each option tagged with its list type. A linked pair SHALL be one option naming both, its have or sale list first ("spares ⇄ binary hunt"), since naming either half compares the two; it stands for the pair whichever half `list` names, and picking it names the have or sale list. It SHALL live in the URL as `list`, a list slug.
- A named list SHALL compare together with its linked list, both ways.
- A list with no link (a sale list, or a have or want list whose linked list doesn't take part) SHALL compare one way. It SHALL be offered under Any and disabled under Mutual, and switching to Mutual while it is selected SHALL reset Compare with to All my lists.
- A disabled option SHALL carry the short muted reason "Compares one way".
- The Post type SHALL never disable a list, and the Post type menu SHALL never disable an option because of the picked list. Every Post type holds posts that any of the viewer's lists can match: a Sell post open to swaps (tagged WTS and WTT) rings every want list on its sale side, Buying only included, and its want side matches the viewer's have lists; a Sell or Swap post that would also pay (tagged WTB) matches the viewer's sale lists. Mutual alone disables, and it fixes the type to WTT.
- Changing the Post type SHALL keep Compare with. Turning on Mutual with a one-way list selected SHALL reset it to All my lists.
- A `list` that is not one of the viewer's lists that take part, or that Mutual can't use, SHALL read as All my lists: in the menu, the compared-lists line and the feed request, which SHALL not send it. The URL is left as it is until the next change.
- The compared lists SHALL replace the viewer's lists everywhere matching shows on For you: the header sentences, the list counts, the rings, Any and Mutual.
- While Compare with names a list, one line under the controls SHALL say what is compared: the named list with its linked list, or the named list alone and which way it compares. With All my lists, no line SHALL show.

The help beside the controls SHALL describe the mutual score as what the two people can swap, the smaller of the two swap counts, with sale lists never counting toward it, and describe Compare with as one list plus its linked list, a list with no link comparing one way.

**Old Browse links.** `/trade` SHALL no longer take `match` or `list`:
- `/trade?match=any`, `/trade?match=mutual` or `/trade?matches=1` SHALL redirect to `/trade/for-you` with the same option (`matches=1` becomes `match=any`), keeping `list` and the filters;
- `/trade?match=off` SHALL drop `match` and `list` and stay on Browse;
- on a viewer who can't use For you, the redirected address then sends them on as Who sees it says.

**Layout.** On every width, Compare with, the Can swap button and the help SHALL follow the Post type menu in that order; from `md` up they sit on the facet row after a divider. Below `md`, the Filters button, Reset, the Post type menu, Compare with, the Can swap button and the help SHALL sit in that order in one row that wraps onto further lines when it doesn't fit, so the page doesn't scroll sideways. The DOM order SHALL match the visual order, so keyboard order follows it. The compared-lists line SHALL sit under the row. There SHALL be no separate Matching button or sheet. A change SHALL apply at once.

#### Scenario: Default is Any
- **WHEN** a signed-in viewer with want list "binary hunt" opens `/trade/for-you` with no parameters
- **THEN** Can swap is off, Compare with reads All my lists with no compared-lists line under it, and only posts holding an objekt that matches the viewer's lists are listed, narrowed and ringed

#### Scenario: Turn matching off
- **WHEN** the viewer on For you wants every post
- **THEN** For you offers only the Can swap button, and the viewer activates the Browse tab instead

#### Scenario: Old Browse link
- **WHEN** a signed-in viewer with a want list opens `/trade?match=mutual&list=spares` from an older link
- **THEN** the browser is at `/trade/for-you?match=mutual&list=spares`

#### Scenario: Old Only matches link
- **WHEN** a signed-in viewer with a want list opens `/trade?matches=1`
- **THEN** the browser is at `/trade/for-you?match=any`

#### Scenario: Old Off link
- **WHEN** a signed-in viewer opens `/trade?match=off&list=spares`
- **THEN** the browser is at `/trade` and every post is listed

#### Scenario: Mutual ranks people
- **WHEN** the viewer turns on Can swap, and rin.trades has a mutual score of 3 with two posts and kaede.k has a mutual score of 1 with one post bumped more recently than either
- **THEN** the URL carries `match=mutual`, rin.trades's row is listed first holding both posts, and kaede.k's row follows

#### Scenario: Sale-only person under Mutual
- **WHEN** jinsoul.blue matches the viewer both ways only through sale lists, against want lists open to swaps or buying
- **THEN** jinsoul.blue is listed under Any in the One way section, is not listed under Can swap, and is not counted in Mutual N

#### Scenario: Sale-only person against a swaps-only want list
- **WHEN** jinsoul.blue's only match in one direction is a sale list against a want list open to swaps only
- **THEN** that direction counts 0, and jinsoul.blue's posts are listed under Any if they match the other way, and not under Mutual

#### Scenario: Type under Mutual
- **WHEN** under Any the viewer picks WTS in the Post type menu and then turns on Can swap
- **THEN** the menu reads WTT with All, WTB and WTS disabled, the URL no longer carries `type`, only WTT posts are listed, and the button stays where it was

#### Scenario: More under Mutual
- **WHEN** 20 people are mutual with the viewer and the viewer scrolls past the first 12 rows
- **THEN** the feed loads the remaining 8 in the same order, without repeating a person

#### Scenario: Compare one pair
- **WHEN** under Mutual the viewer picks "spares ⇄ binary hunt", have list "spares" linked to want list "binary hunt"
- **THEN** the URL carries `list=spares`, the line reads "What you have: spares. What you want: binary hunt.", header sentences, list counts and rings count only those two lists, and the button counts the mutual people for them

#### Scenario: A link naming the want half
- **WHEN** a want-list alert opens `/trade/for-you?match=any&list=binary-hunt`, and "binary hunt" is linked to have list "spares"
- **THEN** Compare with reads "spares ⇄ binary hunt", and both lists are compared

#### Scenario: Lone list under Mutual
- **WHEN** under Any the viewer picks sale list "duplicates" and then turns on Can swap
- **THEN** Compare with resets to All my lists, and "duplicates" is offered disabled

#### Scenario: Post type disables no list
- **WHEN** on For you the viewer picks Post type WTS, and has a lone have list, a sale list, a lone Buying only want list and a have and want pair
- **THEN** Compare with offers all of them enabled, with no reason beside any

#### Scenario: Switching Post type keeps the list
- **WHEN** under Any the viewer has picked a lone want list "bulk buys" set to Buying only and then picks Post type WTB
- **THEN** Compare with still reads "bulk buys" and the URL keeps `list=bulk-buys`

#### Scenario: Old link with a list Mutual can't use
- **WHEN** the viewer opens `/trade/for-you?match=mutual&list=binary-hunt` and "binary-hunt" is a lone want list
- **THEN** Compare with reads All my lists, no compared-lists line shows, and the feed is requested without that list

#### Scenario: Mutual count ignores Post type
- **WHEN** the viewer has picked WTB and a have list
- **THEN** the Can swap count is the one for that list, as under All

#### Scenario: Mutual only switch last
- **WHEN** the viewer opens For you at 1280 px
- **THEN** the Can swap button sits right after Compare with and before the help, with the divider between Post type and Compare with

#### Scenario: Mutual count
- **WHEN** 4 people match the viewer mutually with all lists compared
- **THEN** the button reads "Can swap 4", the tab reads "For you", and a screen reader announces the count

#### Scenario: Mutual count ignores filters
- **WHEN** the button reads "Can swap 4", Can swap is pressed, and the viewer filters to member SeoYeon, which only 1 of those people's matching posts holds
- **THEN** the button still reads "Can swap 4", and the feed lists that 1 person

#### Scenario: Foreign list slug
- **WHEN** the URL's `list` is the slug of another account's list
- **THEN** all of the viewer's lists are compared and Compare with shows All my lists

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade/for-you?match=mutual`
- **THEN** the browser is at `/login`, and after signing in with a want list they land on `/trade/for-you?match=mutual`

#### Scenario: No list that can match
- **WHEN** a signed-in viewer whose only list is a have list not bound to a Cosmo profile opens `/trade/for-you?list=spares&member=SeoYeon`
- **THEN** the browser is at `/trade?member=SeoYeon`

#### Scenario: Phone
- **WHEN** the viewer opens `/trade/for-you?match=mutual&list=spares` at 390 px
- **THEN** the Filters button, Reset, the Post type menu, Compare with naming spares, the Can swap button (pressed) and the help wrap across the row's lines, no collection filter shows on the row, the compared-lists line sits under it, and the page doesn't scroll sideways

#### Scenario: Two sections under Any
- **WHEN** the viewer opens `/trade/for-you`, rin.trades is mutual with one WTT post and one WTS post, and sodalove matches them one way
- **THEN** the feed opens with the heading Mutual over rin.trades's row, holding both posts in the Trade card's order, then the heading One way over sodalove's row

#### Scenario: Mutual only through a sale list
- **WHEN** under Any, jinsoul.blue is mutual with the viewer only through a sale list and a want list, and has no WTT post
- **THEN** jinsoul.blue's row is listed under One way, not Mutual

#### Scenario: Most matches first
- **WHEN** under Any, sodalove's one-way counts add up to 7 and hyhedgehog's to 1, and hyhedgehog bumped more recently
- **THEN** sodalove's row is listed above hyhedgehog's in One way

#### Scenario: Past the ranked people
- **WHEN** under Any, more people match the viewer than matching ranks, and the viewer scrolls past every ranked person
- **THEN** the feed goes on with the other matching people, newest bump first, without repeating a person

#### Scenario: Nobody mutual under Any
- **WHEN** under Any no one matches the viewer both ways, and some posts match one way
- **THEN** the feed shows no Can swap heading and opens with the One way heading

#### Scenario: Headings under Mutual only
- **WHEN** the viewer turns on Can swap
- **THEN** the feed lists the Mutual people with no section heading
