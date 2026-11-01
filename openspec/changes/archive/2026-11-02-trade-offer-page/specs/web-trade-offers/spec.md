## MODIFIED Requirements

### Requirement: Offer builder
The builder SHALL be a page, `/trade/@<handle>/offer` (see Offer page), never a dialog. It shows:
- You give, with an Add picker over the sender's own objekts, entries on their bound have and sale lists first;
- You get, with an Add picker over the allowed list entries, labelled "Add from {name}'s lists"; or, when the partner has no have or sale list bound to a Cosmo profile and on Trade, an Add picker over their collection, labelled "Add from {name}'s collection", listing what they hold at their linked addresses, newest received first;
- the top-up and the note.

Opened from a Market listing, You get's picker SHALL open with its List choice on the listing's sale list; opened anywhere else, on All their lists.

Each pickable objekt SHALL show its flags (not transferable, reserved, in another of the user's own open offers). Send SHALL stay disabled until the offer holds at least one objekt.

Each picker SHALL narrow by artist, member, season, class, collection number, and online or offline, in that order, with the same controls as the page filter bar, where artist, member, season, class and collection number each take more than one value, picking artists limits the member choices to those artists' members, and a Reset clears every filter but the matching switch; and SHALL load more as it scrolls, 200 objekts at a time, so a long list does not land at once. Each SHALL also offer a matching switch:
- You give: "Only what they want", off by default, keeps collections on the partner's discoverable want lists.
- You get: "Only what I want", off by default, keeps collections on the sender's want lists.

Below `sm`, each picker SHALL keep only its search field and a Filters button in view, the button counting the filters, List and matching switch that are set; choosing it SHALL show those controls in place. Its description SHALL be read to assistive technology only, and its footer SHALL be one row: the picked count, Cancel and Done.

You give's picker SHALL offer a **List** choice, after the filters: All your objekts, the default, which shows the have and sale list entries first as above; or one of the sender's have, sale or general lists, each shown with its list type badge, which shows only the objekts on that list the sender still holds at a linked address, with no separate list-first section. The filters and the matching switch apply on top of List.

You get's picker over lists SHALL offer a **List** choice, after the filters, when the partner has a have or sale list on Trade: All their lists; or one of those lists, shown as its name after its list type badge as in Compare with, which shows only that list's entries the sender may ask for. The filters and the matching switch apply on top of List. List changes only what the picker shows, not what may be sent. With a list picked, an empty picker SHALL say that nothing matches the filters, or else that nothing on that list is available.

An empty You get picker over lists SHALL say why: the partner lists nothing the sender may ask for; nothing matches the filters; or the partner no longer holds anything they listed. The first reason SHALL win over the filters. An empty picker over their collection SHALL say the partner holds nothing the sender can ask for, or that nothing matches the filters. In either picker, when the matching switch is on and no other filter is set, "nothing matches the filters" SHALL instead say that nothing held is on the other side's want lists ("rin.trades holds nothing on your want lists" in You get, "You hold nothing on rin.trades's want lists" in You give) and offer Turn off for the switch.

#### Scenario: Partner lists nothing
- **WHEN** the partner's only list on Trade is a have list with no entries, and the sender opens You get's picker with "Only what I want" on
- **THEN** the picker says the partner lists nothing the sender can ask for, not that the filters match nothing

#### Scenario: Partner with no lists
- **WHEN** the partner has no have or sale list on Trade and the sender opens the builder
- **THEN** You get's button reads "Add from {name}'s collection", and its picker shows the objekts the partner holds, newest first, loading more as it scrolls

#### Scenario: Partner with a list
- **WHEN** the partner has one bound have list on Trade
- **THEN** You get's button reads "Add from {name}'s lists", and its picker shows only that list's entries

#### Scenario: From a post
- **WHEN** rin.trades has the have list "doubles" and the sale list "spares" on Trade, and the sender opens the builder from rin.trades's Trade row, whose lead post is "doubles"
- **THEN** You get's button reads "Add from rin.trades's lists", and its picker opens on All their lists, showing the entries of both

#### Scenario: A list kept off Trade
- **WHEN** rin.trades has the bound have list "doubles" on Trade and the bound have list "private" off Trade
- **THEN** You get's picker and its List choice show "doubles" only, and an offer asking for an entry only on "private" is refused when sent

#### Scenario: From a WTB post
- **WHEN** the sender opens the builder from rin.trades's WTB post, and rin.trades has "doubles" and "spares" on Trade
- **THEN** You get's button reads "Add from rin.trades's lists", and its picker shows the entries of both lists

#### Scenario: From a Market listing
- **WHEN** the sender chooses Make offer on rin.trades's listing in an objekt's Market tab, which comes from the sale list "spares"
- **THEN** the builder opens with that objekt under You get, and You get's picker opens on "spares" under List, from which the sender MAY switch to All their lists

#### Scenario: From a conversation
- **WHEN** the sender opens the builder from their conversation with rin.trades, who has "doubles" and "spares" on Trade
- **THEN** You get's button reads "Add from rin.trades's lists", and its picker shows the entries of both lists

#### Scenario: Pick one of my lists
- **WHEN** the sender picks their sale list "doubles" under List, and holds 4 of its 6 entries
- **THEN** the picker shows those 4 objekts only

#### Scenario: Pick one of their lists
- **WHEN** the sender, in their conversation with rin.trades, opens You get's picker and picks rin.trades's sale list "spares" under List
- **THEN** the picker shows only the entries of "spares" the sender may ask for

#### Scenario: Their List shown for one list
- **WHEN** rin.trades has exactly one have or sale list on Trade
- **THEN** You get's picker offers a List choice of All their lists and that list

#### Scenario: Their List hidden over a collection
- **WHEN** rin.trades has no have or sale list on Trade, and the sender opens You get's picker
- **THEN** the collection picker offers no List choice

#### Scenario: Artist narrows members
- **WHEN** the sender picks ARTMS under Artist
- **THEN** the member choice offers only ARTMS members, and the picker shows only ARTMS objekts

#### Scenario: Online and collection number
- **WHEN** the sender picks Offline and collection number 204Z
- **THEN** the picker shows only offline objekts of collections numbered 204Z

#### Scenario: Phone width
- **WHEN** the builder is open at 390 px
- **THEN** the two sides stack vertically, and the page doesn't scroll sideways

#### Scenario: Picker on a phone
- **WHEN** the sender opens You get's picker at 390 px with "Only what I want" on
- **THEN** the search field and "Filters 1" sit on one row above the grid, the footer is one row, and choosing Filters shows the filters, List and the switch

#### Scenario: Switches start off
- **WHEN** a sender with a want list opens the builder
- **THEN** both "Only what they want" and "Only what I want" are off, and You get's picker lists every entry the sender may ask for

### Requirement: Picks in the builder
Each side of the offer builder SHALL show its picks as a grid of small cards, as many a row as the side's width allows (six at 1280 px, four on a phone), each with its art, collection code and serial (or its any-copy count) and a remove button named for the objekt. The grid SHALL grow with the page rather than scroll inside its side; the column keeps the top-up, the note and Send in reach whatever the count, and on a phone Send stays in the bottom bar. A pick's warnings SHALL show with its card.

#### Scenario: Large offer
- **WHEN** the sender holds 24 picks under You give and 31 under You get
- **THEN** each side shows its picks six a row at 1280 px, the page scrolls to show them all, and the column with the top-up, note and Send stays on screen

#### Scenario: Remove one
- **WHEN** the sender chooses the remove button on SeoAh 203Z #722
- **THEN** that pick leaves the side, and the side's count drops by one

#### Scenario: Several copies
- **WHEN** You get holds 3 copies of Lynn 301A in any serial
- **THEN** one card shows Lynn 301A marked "×3"

### Requirement: Reading the matches
While the read runs, the builder SHALL show its title, a status line reading "Adding your matches…", a placeholder for each side and Cancel, and no picker, send hint or Send. The status line SHALL stay in one place from the first frame to the close, then say what was added or that the read failed. Focus SHALL start on the page's title.

#### Scenario: Loading
- **WHEN** the builder is reading the matches
- **THEN** it shows its title, the status line "Adding your matches…", a placeholder for each side and Cancel, with no picker, no "Add at least one objekt to either side." hint and no Send, and focus is on the page's title

#### Scenario: One status line throughout
- **WHEN** the read ends and the sides appear
- **THEN** "Adding your matches…" is replaced in the same status line by what was added, and no second status line or alert appears

### Requirement: Closing after matches were added
Leaving the page (see Leaving the offer page) SHALL ask nothing when the added picks are unchanged, or when the builder holds nothing (no picks, no top-up amount and no note), including after Remove matches. Otherwise leaving SHALL ask as for any draft.

#### Scenario: Close unchanged
- **WHEN** the sender activates Back without changing the added picks
- **THEN** the page is left without asking to discard

#### Scenario: Close empty after Remove matches
- **WHEN** the sender chooses Remove matches with no picks of their own, no top-up amount and no note, and then activates Cancel
- **THEN** the page is left without asking to discard

#### Scenario: Close with the sender's own pick
- **WHEN** the sender chooses Remove matches while JiWoo 101Z they added is still under You get, and then activates Back
- **THEN** it asks to discard, as for any draft

## ADDED Requirements

### Requirement: Offer page
Every Make offer and Counter SHALL open the offer page, `/trade/@<handle>/offer` of the partner (see `web-trade-person-pages` Trade handle): on a Trade row and each post's menu, the person and post pages, a near match's Make offer with it, chat's Add to message and deal strip, Counter, the trade page's status card, and a Market tab listing. The page SHALL start as the dialog did from the same place, with the same address, prefill and matches.

#### Scenario: From a Trade row
- **WHEN** a signed-in viewer activates Make offer on rin.trades's row on For you under Mutual only
- **THEN** rin.trades's offer page opens, addressed to the row's lead post, with the matches the row's chip counts added

#### Scenario: Counter
- **WHEN** the sender activates Counter on rin.trades's offer O-881 in their conversation
- **THEN** rin.trades's offer page opens titled as a counter, with O-881's picks, top-up and note, and Send counter-offer

#### Scenario: From a Market listing
- **WHEN** the sender activates Make offer on rin.trades's listing of SeoYeon 204Z #537 from sale list "spares"
- **THEN** rin.trades's offer page opens with that objekt under You get, its picker opening on "spares"

### Requirement: Offer page address
The page's URL SHALL say how the offer starts: the list or the conversation it is addressed to, which matches to add (the row's under its Compare with list and Mutual only, or one post's), a near match to add, the countered offer, or a Market listing's objekt and sale list, and where to return. It SHALL never carry the sender's picks; a Market link names only the one listed objekt it starts from. Reopening the URL SHALL start the offer again from the same point.

#### Scenario: Reload
- **WHEN** the sender reloads the page after adding one objekt of their own to the added matches
- **THEN** the browser asks to leave, and after leaving the page opens again with the matches added and without that objekt

#### Scenario: Countered offer not theirs
- **WHEN** the URL names an offer the viewer is not a party to, or one that is no longer open
- **THEN** the page says the offer can't be countered and offers Back

### Requirement: Offer page access
A signed-out visitor SHALL be sent to sign in and back. A handle other than the partner's canonical one SHALL redirect as on the person page, keeping the rest of the URL. A handle with no account SHALL show not found.

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade/@rin.trades/offer`
- **THEN** sign in opens, and after signing in they are back on that page

#### Scenario: Other nickname
- **WHEN** the sender opens `/trade/@rin.alt/offer?post=<spares slug>`, rin.alt being linked to rin.trades's account
- **THEN** the browser is at `/trade/@rin.trades/offer?post=<spares slug>`

### Requirement: Offer page layout
From `lg` up, the page SHALL hold a narrow column, the title over a sticky part with the top-up, the note, Sending as, the send hint and Send, beside a main area with the status line across its width and then You get and You give side by side. The title scrolls with the page. Back to <name> SHALL lead the page. Add SHALL open the picker in a sheet from the end edge, as wide as the main area, with the column still in view.

#### Scenario: Desktop
- **WHEN** the sender opens rin.trades's offer page at 1440 px with 50 matches added under You get
- **THEN** the column shows the title, top-up, note and Send, the line "Added 50 you get…" spans the main area, and You get and You give sit side by side under it

#### Scenario: Scrolled
- **WHEN** the sender scrolls down to the last rows of the 50 picks at 1440 px
- **THEN** the title has scrolled away, and the top-up, note and Send stay in view beside the sides

#### Scenario: Picker
- **WHEN** the sender activates Add from rin.trades's lists at 1440 px
- **THEN** the picker opens as a sheet over the main area, and the column with Send stays visible

### Requirement: Offer page on a phone
Below `lg`, the page SHALL stack the title, the status line, You get, You give, the top-up and the note, with Send and the send hint in a bottom bar, and the picker SHALL take the full screen. The page SHALL not scroll sideways.

#### Scenario: Phone
- **WHEN** the sender opens the offer page at 390 px
- **THEN** the sides stack, Send sits in the bottom bar, and Add opens the picker full screen

### Requirement: Leaving the offer page
Back to <name> and Cancel SHALL return to the page the offer was started from, or to the partner's person page when there is none. Leaving by Back, Cancel, a link or the browser's back SHALL ask as Closing after matches were added says; a reload or closing the tab SHALL get the browser's own prompt under the same rule. Sending SHALL go to the conversation, and from a conversation return there.

#### Scenario: Back to chat
- **WHEN** the sender opens Make offer from their conversation with rin.trades and activates Cancel with nothing changed
- **THEN** the conversation opens again

#### Scenario: Link away with a draft
- **WHEN** the sender has added a note and activates the Trade tab in the header
- **THEN** they are asked to discard the draft, and staying keeps the page as it was
