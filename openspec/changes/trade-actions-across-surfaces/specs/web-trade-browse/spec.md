## MODIFIED Requirements

### Requirement: Message a post's owner
Each person's row not the viewer's own SHALL offer Message, under the rules in `web-chat`. Message SHALL open the conversation with the person, adding a post card for the row's lead post (see Trade card), never an objekt card. When the viewer has matches with the person, as the row's header sentence shows, the post card SHALL carry the match; otherwise it SHALL carry none. Each post of such a row SHALL also offer Message about this post, in its ⋯ menu and its "+N" sheet's footer: it opens the same conversation with a post card for that post instead of the lead post, carrying the match when one of that post's strips counts a match and none otherwise. A person who doesn't take messages from the viewer SHALL show "Not taking messages" in place of Message and Make offer, and their posts SHALL offer no Message about this post.

#### Scenario: From a post
- **WHEN** a signed-in user with a linked address and no matches with rin.trades activates Message on rin.trades's row, whose lead post is a WTT post
- **THEN** the conversation with rin.trades opens in the Inbox, with a post card for that WTT post attached, and no objekt card

#### Scenario: From a post with matches
- **WHEN** a signed-in user whose row for mina reads "You can swap 2" activates Message on it
- **THEN** the conversation opens with a post card for mina's lead post, carrying the match, attached

#### Scenario: About one post
- **WHEN** a signed-in user chooses Message about this post in the ⋯ menu of rin.trades's WTS post "spares", which is not rin.trades's lead post and counts no match
- **THEN** the conversation with rin.trades opens with a post card for "spares", carrying no match, and no card for the lead post

#### Scenario: About one post with a match
- **WHEN** a signed-in user chooses Message about this post on mina's post "extras", whose HAVE strip reads "2 you want"
- **THEN** the conversation opens with a post card for "extras", carrying the match

#### Scenario: Not taking messages
- **WHEN** a row shows "Not taking messages"
- **THEN** no post of that row offers Message about this post, in its menu or its "+N" sheet

### Requirement: Make offer on a post
Each row that shows Message SHALL also offer Make offer. It opens the offer builder for the person, addressed to the row's lead post's own list: the have list of a pair, or the post's only list. You get SHALL ask from all of the person's have and sale lists on Trade, as from a conversation, its picker opening on All their lists (see `web-trade-offers`).

The builder SHALL open with the viewer's matches with the person already added, chosen from those the row counts under the current Compare with list by the rule the row's chip follows (see `web-trade-offers` Matches added when the builder opens), and with none when the row has no match. Add SHALL open the full picker.

A person with no linked Cosmo profile has no Trade handle and so no offer page (see `web-trade-person-pages` Trade handle), and an offer to them could never be accepted. For them, Make offer SHALL show disabled, staying focusable, and say that offers need a linked Cosmo profile, which they have not linked yet; activating it SHALL say the same. It SHALL never be left out without a reason while Message shows.

#### Scenario: From a WTT post
- **WHEN** a user activates Make offer on rin.trades's row, whose lead post is the have list "doubles" with the most matches, and rin.trades also has the sale list "spares" on Trade
- **THEN** the builder opens addressed to rin.trades, and You get's picker lists the entries of "doubles" and "spares"

#### Scenario: WTB post
- **WHEN** a user activates Make offer on a row whose only post is a WTB post wanting HaSeul 302Z open to swaps, and holds a sendable copy of it on a have list
- **THEN** the builder opens with that copy under You give and the line "Added 1 you give from your match", You give's picker lists the copy as picked, and You get's picker asks from the person's have and sale lists, or their collection when they have none

#### Scenario: Row with no match
- **WHEN** a user activates Make offer on a row with no header sentence, since nothing matches
- **THEN** the builder opens with nothing under You give or You get

#### Scenario: Person with no Cosmo profile
- **WHEN** a signed-in user sees the row of hana, whose account links no Cosmo profile and whose only post is a want list
- **THEN** the row shows Message and a disabled Make offer, and focusing or activating Make offer says that offers need a linked Cosmo profile, which hana hasn't linked yet

### Requirement: Your posts and Post a list
A signed-in viewer's posts SHALL be summarised above the feed in one row: the title Your posts, how many of them are listed, how many are idle, when the next bump is allowed while it is not, the one Bump control (see Bump), disabled until then, a Copy link control, a New post control that opens the post composer, and a control that shows or hides the posts. The row SHALL show on Browse; For you and a signed-out visitor SHALL keep a New post control above the feed in its place. Shown, each entry SHALL be one post and show:
- its tags and kind (Swap, Sell or Buy);
- each list with its role: Offering for a have list, Looking for for a want list, Selling for a sale list, each linking to its list page;
- the option it carries: "Would also pay" on a Swap post that would, "Also on Market" on a Sell post;
- whether the post is listed or idle, and when it was last changed;
- a menu with Edit post, View post, Copy link and Take off Trade.

The row's Copy link SHALL copy the viewer's person page (see `web-trade-person-pages`), `/trade/@<their handle>`, and each entry's menu SHALL also hold Copy link, copying that post's page, `/trade/@<their handle>/<anchor slug>`; each confirms with "Link copied" and the copied address. The row's Copy link SHALL be disabled while none of the posts is listed, the viewer is under a trade block, or the viewer has no linked Cosmo profile and so no handle, staying focusable and saying which reason applies. An entry's View post SHALL open that post's page in the same tab. An entry's View post and Copy link SHALL each be disabled in the same way while that post is idle, or for the same block or missing profile.

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

#### Scenario: View one post
- **WHEN** the viewer chooses View post in the menu of their listed Swap post anchored on "spares"
- **THEN** `/trade/@<their handle>/<spares slug>` opens, showing that post outlined

#### Scenario: View post on an idle post
- **WHEN** the viewer opens the menu of an idle post
- **THEN** View post and Copy link are disabled, each saying to bump first

### Requirement: Trade card
Each person in the feed SHALL be one row, a bordered card on the card surface, one row to a line at every width. A row holds:
- **Header**:
  - the avatar;
  - the name, headed as For you heads a partner (see `web-trade-for-you` Partner identity), linking to the profile, with the Discord and X badges the person chose to show, wrapping onto the next line when they don't fit. On Browse, the viewer's own row SHALL carry a muted "You" tag after the name;
  - the reputation line (see `web-verified-trades`), wrapping between its " · " segments rather than truncating, so its full text always shows;
  - for a signed-in viewer on another person's row, the header sentence, from the counts in Matches to the signed-in viewer, with A the "They have" count, B the "You have" count and M the mutual score. Beside the name, a chip: "You can swap M", tinted, when M is above zero; any other row has no chip. Under the reputation line, a muted line with "They have A you want" when A is above zero and "You have B they want" when B is above zero. With no count above zero the row SHALL show neither, so a row without them reads as no match. Each number SHALL be in monospace and stand out from the words, and the visible words SHALL be the accessible text;
  - on the reputation line, after it, muted: the number of the person's kept lists ("3 lists") and when their newest post was last bumped, or last changed if that is later;
  - the ⋯ menu, holding View Trade page, which opens their person page, and Copy link, which copies it (see `web-trade-person-pages`), then Hide, Block and Report for a signed-in viewer who is not the person; a signed-out visitor's menu holds View Trade page and Copy link alone. View Trade page SHALL be left out on the person page itself. Both SHALL be disabled, saying why, for a person with no linked Cosmo profile. The name keeps linking to the profile.
- **Actions**: Message, then Make offer as the primary button, both for the row's lead post (see Message a post's owner and Make offer on a post). An account that doesn't take messages from the viewer shows "Not taking messages" in their place. For a person with no linked Cosmo profile, Make offer shows disabled with its reason. The viewer's own row has no Message or Make offer; on their person and post pages it carries the owner's actions instead (see `web-trade-person-pages` Owner's view).
- **Posts**, under the header: each of the person's kept posts, in this order: posts with a list count above zero first, most matched collections first; then the rest, newest bump first. The first post in this order is the row's lead post. Each post shows:
  - its tags, which say what it takes (see Tag help);
  - a WTT post with both lists: the HAVE strip and the WANT strip side by side, sharing the width equally, with a ⇄ mark between them;
  - a post with one side (WTS, WTB, or half a pair): that one strip across the width;
  - a side with no related objekt or no entries: the muted line Filters describes, under the other strip, with no ⇄ mark;
  - its lists' descriptions, empty sides' included, in one muted block set off by a rule at its start edge, under all its sides: each clipped to eight lines, keeping the owner's line breaks. A text both lists of a pair share SHALL show once. When two different descriptions show, each SHALL lead with its side's role label in its list type's colour. Under all the sides, never under one strip, so a description never pushes one strip's thumbnails below the other's.
  - a ⋯ menu (see Post menu) holding View post, which opens that post's page, and Copy link, which copies it (see `web-trade-person-pages`), both disabled, saying why, for a person with no linked Cosmo profile. View post SHALL be left out on that post's own page.
- **All lists**: the row SHALL show every post it holds.

**Strip**: a monospace role label in its list type's colour, then " · " and the list's name, truncated to one line, then the list's own count when above zero ("14 you want", "2 you have"), on a tinted chip in monospace; under a narrowing filter the label reads as Filters says. The label SHALL link to the list page, carrying the list's name in its title; the list's description sits under the post's sides (see Posts). The count SHALL sit beside the link, not in it, and activating it SHALL open a popover, "Matched with your lists", naming each of the viewer's lists that count was taken against, with its type and a link to it: on a want list the viewer's have and sale lists, on a have or sale list the viewer's want lists, as Compare with narrows them. Under a want list, it SHALL also name each rule the match went through, "via rule" with the rule's label and how many collections, on Browse as on For you (see Matched through your rules). Under it, one line of thumbnails 2.5rem wide with no caption, ringed objekts first. A strip SHALL never wrap: it shows as many thumbnails as fit its width, and when some don't fit, the last place holds a "+N" tile counting the copies not shown. On a narrowed strip that shows its count chip, which counts collections, the "+N" tile SHALL count the collections not shown instead, and "of N" the list's collections, as its sheet's All tab does, so they all read in one unit.

**All of a list.** Activating a strip's "+N" tile SHALL open a sheet of that one list, never of the person's other posts, sliding in from the end side at every width: the viewport less 3rem below `sm`, up to 48rem from `sm` up. Its title is the list's name and its description the list's type. When the list has a description, the sheet SHALL show it in full above the objekts, scrolling with them. It SHALL list the list's objekts in columns that follow its width, one per 112 px and at least three, as the objekt pickers lay theirs out, copies of a collection stacked into one card with their count, those that match the viewer ringed as the strip rings them and first, then newest; a rule's objekts stay on its tile. When any match, two tabs SHALL lead it, "N you want" (on a want list "N you have") and "All N", counting collections, with the matching tab open first; otherwise it shows the list alone. Every collection of the list SHALL be reachable by scrolling, however many it holds: the objekts load in pages as the viewer nears the end of those shown, and nothing is left for the list page to show. On a sale side, each card SHALL show its price under its art, as the list page shows it: one price when every priced copy of its stack agrees, the lowest and highest ("RM 10–RM 15") when they differ, "QYOP" when no copy is priced and one is QYOP, and otherwise "No price", muted. A card whose copies carry notes SHALL offer them behind the note button beside its price, each distinct note once. A have or want side's cards SHALL show no price or note. The rings follow For you's Compare with, the owner's own list rings nothing, and a signed-out visitor sees no rings or tabs. A want side's rules SHALL lead the sheet as the strip's RULE tiles, since its objekt counts leave them out. When the feed's filters or matching narrowed the strip, the sheet SHALL still show the whole list of objekts and say that those aren't filtered; the RULE tiles keep the strip's counts. The objekts SHALL load only when the sheet opens. Activating an objekt SHALL close the sheet and open the objekt view. The footer SHALL offer Open list, which goes to the list page, and Close. On a post not the viewer's own, it SHALL first offer Message about this post and Make offer on this post, for the same post and under the same rules as its ⋯ menu (see Message a post's owner and Where Make offer on one post shows), each closing the sheet before it opens anything. The footer SHALL wrap rather than scroll sideways.

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
- **THEN** it offers View Trade page, Copy link, Hide, Block and Report, and Copy link copies `/trade/@rin.trades`

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

#### Scenario: View a person's Trade page
- **WHEN** a viewer on Browse chooses View Trade page in the ⋯ menu of rin.trades's row
- **THEN** `/trade/@rin.trades` opens, and activating rin.trades's name on the row still opens their profile

#### Scenario: No View Trade page on the person page
- **WHEN** a viewer opens the ⋯ menu of the row on `/trade/@rin.trades`
- **THEN** it offers Copy link and no View Trade page

#### Scenario: View a post's page
- **WHEN** a visitor chooses View post in the ⋯ menu of rin.trades's post anchored on "spares"
- **THEN** `/trade/@rin.trades/<spares slug>` opens

#### Scenario: Actions in the sheet
- **WHEN** a signed-in user opens "+20" on rin.trades's post "doubles" and activates Make offer on this post in the sheet's footer
- **THEN** the sheet closes and the builder opens as Make offer on this post on "doubles" opens it

#### Scenario: Message from the sheet
- **WHEN** a signed-in user activates Message about this post in the footer of the sheet of rin.trades's post "spares"
- **THEN** the sheet closes and the conversation with rin.trades opens with a post card for "spares"

#### Scenario: Own sheet
- **WHEN** the viewer opens "+N" on one of their own posts
- **THEN** the footer offers Open list and Close only

#### Scenario: Sheet footer on a phone
- **WHEN** at 390 px a signed-in user opens "+N" on another person's post
- **THEN** the footer's four controls wrap onto as many lines as they need, and the sheet doesn't scroll sideways

### Requirement: Post menu
Each post on a person's row, on Browse, For you and the person and post pages, SHALL carry a ⋯ menu: a ghost icon button in a column of its own at the post's top end, never inside a strip's label. Its accessible name SHALL be "More actions for the post {list}", where `{list}` is the post's own list (the have list of a pair). On another person's post, the menu SHALL offer Make offer on this post and Message about this post first, then Show all of {list} for each strip, which opens that strip's "+N" sheet whether or not it has the tile, then View post and Copy link. On the viewer's own post it SHALL offer Edit post first, then Show all of {list} for each strip, then View post, Copy link and Take off Trade (see Owner actions on a post).

#### Scenario: Menu on a WTT post
- **WHEN** a user opens the ⋯ menu of rin.trades's post with the have list "doubles" and the want list "wants", on a row that also has the post "spares"
- **THEN** its button is named "More actions for the post doubles", and it offers Make offer on this post, Message about this post, Show all of doubles, Show all of wants, View post and Copy link

#### Scenario: Show all without a "+N" tile
- **WHEN** a strip shows all of its 5 objekts, so it has no "+N" tile, and the user chooses its Show all
- **THEN** the sheet of that list opens as the "+N" tile would open it, and closing it returns focus to the menu's button

#### Scenario: Phone
- **WHEN** a row is shown at 390 px
- **THEN** each post's ⋯ button stays inside the post in its own column, its target at least 24 px, and the strips stay one line without the page scrolling sideways

### Requirement: Where Make offer on one post shows
Make offer on this post and Message about this post SHALL be left out on the viewer's own posts and on a row that shows "Not taking messages"; the menu then offers Show all, View post and Copy link, and on the viewer's own posts also the owner's actions. For a person with no linked Cosmo profile, Make offer on this post SHALL show disabled with its reason as a second line, as on the row (see Make offer on a post), and Message about this post SHALL still show.

#### Scenario: One post on the row
- **WHEN** a user opens the ⋯ menu on mina.swaps's row, whose only post is the have list "extras"
- **THEN** it offers Make offer on this post, Message about this post and Show all of extras, as on a row of several posts

#### Scenario: Sell-only post
- **WHEN** a user opens the ⋯ menu of a WTS post on a Sell only sale list
- **THEN** it offers Make offer on this post and Show all, as on any other post

#### Scenario: Not taking messages
- **WHEN** the row shows "Not taking messages"
- **THEN** each post's menu offers Show all, View post and Copy link

#### Scenario: Own post
- **WHEN** the viewer opens the ⋯ menu on one of their own posts
- **THEN** it offers Edit post, Show all, View post, Copy link and Take off Trade

#### Scenario: No Cosmo profile
- **WHEN** a signed-in user opens the ⋯ menu of a post by hana, whose account links no Cosmo profile
- **THEN** it offers Message about this post, a disabled Make offer on this post whose second line says hana hasn't linked a Cosmo profile, Show all, and View post and Copy link disabled with their reason

## ADDED Requirements

### Requirement: Owner actions on a post
On the viewer's own post, on Browse, For you and the person and post pages, the ⋯ menu SHALL offer Edit post and Take off Trade, each acting as in Your posts (see Edit and take off a post). Edit post SHALL return to the page it was chosen on. Bump SHALL stay a control of the person, not of a post, since one bump bumps every post: it shows in the Your posts row and the owner's person and post pages (see `web-trade-person-pages` Owner's view), never in a post's menu.

#### Scenario: Edit from Browse
- **WHEN** the viewer chooses Edit post in the ⋯ menu of their own post "spares" on `/trade`
- **THEN** the post composer opens on that post, and Post returns to `/trade`

#### Scenario: Take off from a post page
- **WHEN** the owner chooses Take off Trade in the ⋯ menu of their post on `/trade/@<their handle>/<spares slug>`
- **THEN** the post leaves Trade with the same Undo toast Your posts shows, and the page says the post is no longer on Trade

#### Scenario: No Bump in a post's menu
- **WHEN** the viewer opens the ⋯ menu of their own post
- **THEN** it offers no Bump

### Requirement: Make offer for one objekt of a post
An objekt opened from a have or sale strip of another person's post, or from that strip's "+N" sheet, SHALL show a line in the objekt view offering Make offer for this objekt wherever that post's menu offers an enabled Make offer on this post. It opens the offer builder asking for that collection from that strip's list (see `web-trade-offers` Ask for one objekt of a post). A near match keeps its own line instead.

#### Scenario: From a have strip
- **WHEN** a signed-in user opens SeoYeon 204Z from the HAVE strip of rin.trades's post "doubles" and activates Make offer for this objekt
- **THEN** the objekt view closes and rin.trades's offer page opens addressed to "doubles", asking for SeoYeon 204Z from "doubles"

#### Scenario: From the sheet
- **WHEN** a signed-in user opens an objekt from the "+N" sheet of rin.trades's sale list "spares"
- **THEN** the objekt view offers Make offer for this objekt, asking from "spares"

#### Scenario: Want strip
- **WHEN** a user opens an objekt from the WANT strip of another person's post
- **THEN** the objekt view shows no Make offer for this objekt

#### Scenario: Own post, closed or no profile
- **WHEN** the objekt comes from the viewer's own post, from a row that shows "Not taking messages", or from a post of a person with no linked Cosmo profile
- **THEN** the objekt view shows no Make offer for this objekt

#### Scenario: Near match
- **WHEN** the objekt is a near match on that strip
- **THEN** the objekt view shows the near match's line with its own Make offer with it, and no second line

#### Scenario: Signed out
- **WHEN** a signed-out visitor activates Make offer for this objekt
- **THEN** they are asked to sign in, as the row's Make offer asks, and no builder opens
