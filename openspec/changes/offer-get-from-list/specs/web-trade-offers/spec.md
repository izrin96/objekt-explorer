## MODIFIED Requirements

### Requirement: Offer builder
The builder SHALL open as a dialog, and as a full-height sheet on a phone. It shows:
- You give, with an Add picker over the sender's own objekts, entries on their bound have and sale lists first;
- You get, with an Add picker over the allowed list entries, labelled "Add from {name}'s lists"; or, when the partner has no have or sale list bound to a Cosmo profile and on Trade, an Add picker over their collection, labelled "Add from {name}'s collection", listing what they hold at linked addresses whose profile is not private to the sender, newest received first;
- the top-up and the note.

Opened for one of the partner's have or sale lists on Trade (from a Trade post or a Market listing), You get's Add picker SHALL list only that list's entries, labelled "Add from {name}'s list", with the same empty-picker reasons as over lists. Opened for any other list, such as a WTB post's want list, You get SHALL work as from a conversation.

Each pickable objekt SHALL show its flags (not transferable, reserved, in another open offer). Send SHALL stay disabled until the offer holds at least one objekt.

Each picker SHALL narrow by artist, member, season, class, online or offline, and collection number, where picking an artist limits the member choices to that artist's members, and SHALL load more as it scrolls, 200 objekts at a time, so a long list does not land at once. Each SHALL also offer a matching switch:
- You give: "Only what they want", off by default, keeps collections on the partner's discoverable want lists.
- You get: "Only what I want", off by default, keeps collections on the sender's want lists.

You give's picker SHALL offer a **From** choice: All your objekts, the default, which shows the have and sale list entries first as above; or one of the sender's have, sale or general lists, which shows only the objekts on that list the sender still holds at a linked address, with no separate list-first section. The filters and the matching switch apply on top of From.

You get's picker over lists SHALL offer a **From** choice when the offer is not scoped to one list and the partner has more than one have or sale list on Trade: All their lists, the default; or one of those lists, named with its type, which shows only that list's entries the sender may ask for. The filters and the matching switch apply on top of From. From changes only what the picker shows, not what may be sent. With a list picked, an empty picker SHALL say that nothing matches the filters, or else that nothing on that list is available.

An empty You get picker over lists SHALL say why: the partner lists nothing the sender may ask for; nothing matches the filters; or the partner no longer holds anything they listed. The first reason SHALL win over the filters. An empty picker over their collection SHALL say the partner holds nothing the sender can ask for, or that nothing matches the filters.

#### Scenario: Partner lists nothing
- **WHEN** the partner has only want lists and the sender opens You get's picker with "Only what I want" on
- **THEN** the picker says the partner lists nothing the sender can ask for, not that the filters match nothing

#### Scenario: Partner with no lists
- **WHEN** the partner has no have or sale list on Trade and the sender opens the builder
- **THEN** You get's button reads "Add from {name}'s collection", and its picker shows the objekts the partner holds, newest first, loading more as it scrolls

#### Scenario: Partner with a list
- **WHEN** the partner has one bound have list on Trade
- **THEN** You get's button reads "Add from {name}'s lists", and its picker shows only that list's entries

#### Scenario: From a post
- **WHEN** rin.trades has the have list "doubles" and the sale list "spares" on Trade, and the sender opens the builder from rin.trades's post for "doubles"
- **THEN** You get's button reads "Add from rin.trades's list", and its picker shows only the entries of "doubles"

#### Scenario: From a WTB post
- **WHEN** the sender opens the builder from rin.trades's WTB post, and rin.trades has "doubles" and "spares" on Trade
- **THEN** You get's button reads "Add from rin.trades's lists", and its picker shows the entries of both lists

#### Scenario: From a Market listing
- **WHEN** the sender chooses Make offer on rin.trades's listing in an objekt's Market tab, which comes from the sale list "spares"
- **THEN** the builder opens with that objekt under You get, and You get's picker shows only the entries of "spares"

#### Scenario: From a conversation
- **WHEN** the sender opens the builder from their conversation with rin.trades, who has "doubles" and "spares" on Trade
- **THEN** You get's button reads "Add from rin.trades's lists", and its picker shows the entries of both lists

#### Scenario: From one of my lists
- **WHEN** the sender picks their sale list "doubles" under From, and holds 4 of its 6 entries
- **THEN** the picker shows those 4 objekts only

#### Scenario: From one of their lists
- **WHEN** the sender, in their conversation with rin.trades, opens You get's picker and picks rin.trades's sale list "spares" under From
- **THEN** the picker shows only the entries of "spares" the sender may ask for

#### Scenario: Their From hidden when scoped
- **WHEN** the sender opens You get's picker from rin.trades's post for the have list "doubles"
- **THEN** the picker offers no From choice, and shows only the entries of "doubles"

#### Scenario: Their From hidden for one list
- **WHEN** rin.trades has exactly one have or sale list on Trade
- **THEN** You get's picker offers no From choice

#### Scenario: Their From hidden over a collection
- **WHEN** rin.trades has no have or sale list on Trade, and the sender opens You get's picker
- **THEN** the collection picker offers no From choice

#### Scenario: Artist narrows members
- **WHEN** the sender picks ARTMS under Artist
- **THEN** the member choice offers only ARTMS members, and the picker shows only ARTMS objekts

#### Scenario: Online and collection number
- **WHEN** the sender picks Offline and collection number 204Z
- **THEN** the picker shows only offline objekts of collections numbered 204Z

#### Scenario: Phone width
- **WHEN** the builder is open at 390 px
- **THEN** the two sides stack vertically, and the page doesn't scroll sideways

#### Scenario: Switches start off
- **WHEN** a sender with a want list opens the builder
- **THEN** both "Only what they want" and "Only what I want" are off, and You get's picker lists every entry the sender may ask for
