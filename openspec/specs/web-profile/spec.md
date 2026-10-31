# web-profile Specification

## Purpose
A Cosmo profile on `apps/web`: what an address owns, pinned and locked, at any date, plus
its trades, collection progress and statistics.

## Requirements

### Requirement: Profile layout and privacy
`/@<nickname>` SHALL resolve a nickname or address to a profile, show its banner, identity,
linked socials when the owner allows, four summary counts and tabs for Collection, Activity
History (at `/@<nickname>/trades`), Progress, Statistics and Lists. Every profile SHALL show in full to every visitor. The owner SHALL see an Edit action opening the profile edit dialog.
An unknown nickname SHALL show the not-found surface.

#### Scenario: Private profile
- **WHEN** a visitor opens a profile that was marked private before this change
- **THEN** the full profile shows, with its objekts, pins and transfers

### Requirement: Owned collection with pins and locks
The Collection tab SHALL list owned objekts with serials, loading more as the user scrolls,
in the profile's configured column count when set. Pinned objekts SHALL appear first in the
grid in the owner's order; the owner SHALL reorder them by drag in place and by Move up /
Move down in the card menu, and pin, unpin, lock and unlock objekts singly and in batch from
the selection bar. Locked objekts SHALL carry a lock mark; the lock filter SHALL cycle all,
only locked, only unlocked. Visitors SHALL see pins and locks but no actions.

#### Scenario: Reorder persists
- **WHEN** the owner drags the third pin to the first position and reloads
- **THEN** it is still first

#### Scenario: Lock tri-state
- **WHEN** the user cycles the lock filter twice from all
- **THEN** the URL is `locked=false` and only unlocked objekts show

### Requirement: Checkpoint view
The toolbar SHALL offer a date; choosing one SHALL put `at=<date>` on the URL and show the
objekts the address held at the end of that day, hide every mutating action and every pin
and lock mark, and keep the date across filter changes until cleared.

#### Scenario: Checkpoint hides actions
- **WHEN** the owner sets a checkpoint
- **THEN** pins no longer lead the grid, cards carry no pin or lock marks, and selecting cards offers no actions

### Requirement: Trades, progress and statistics
The Activity history tab SHALL list the profile's transfers by type (all, mint, received, sent, spin)
with paging, to every visitor. The Progress tab SHALL
show per member and season how many of each class are owned versus total, excluding the
Welcome and Zero classes, with a chart per member. The Statistics tab SHALL chart the owned
collection by member and by season.

#### Scenario: Hidden transfers
- **WHEN** a visitor opens Activity history of a profile that hid its transfers before this change
- **THEN** the tab lists its transfers

#### Scenario: Progress excludes Welcome
- **WHEN** an address owns Welcome-class objekts
- **THEN** Progress totals do not count them

### Requirement: Message from a profile
A profile whose address is linked to an account other than the viewer's SHALL offer Message in its header, under the rules in `web-chat`. A conversation started here carries no card, so it lands in the recipient's Requests. A profile with no linked account, and the viewer's own profile, SHALL show no Message.

#### Scenario: Unlinked address
- **WHEN** a visitor opens the profile of an address no account has linked
- **THEN** the header shows no Message action

### Requirement: Reputation on a profile
A profile whose header shows the linked account SHALL show that account's reputation line (see `web-verified-trades`). A profile whose address no account has linked SHALL show none.

#### Scenario: Unlinked address
- **WHEN** a visitor opens the profile of an address no account has linked
- **THEN** no reputation line is shown

### Requirement: Show my matches on a profile
On someone else's profile, a signed-in viewer SHALL have a Show my matches toggle in the Collection filter bar, off by default. On, the grid SHALL keep only the transferable objekts the profile holds whose collection is on any of the viewer's want lists, whatever each list's Open to, together with the filters. The shown count, selection bar, Add to list and Discord format SHALL read only those. The matches SHALL load only while the toggle is on.

#### Scenario: Turn it on
- **WHEN** a signed-in viewer opens a profile holding 1,200 objekts, 40 transferable ones in 12 collections on the viewer's want list "binary hunt", and turns on Show my matches
- **THEN** the grid shows only those 40 objekts and the count beside the toggle reads "12 you want"

#### Scenario: Not transferable
- **WHEN** the profile holds a copy of a wanted collection that cannot be transferred
- **THEN** that copy is not among the matches

#### Scenario: Buying-only want list
- **WHEN** the viewer's only want list holding a collection is open to buying only
- **THEN** the profile's transferable copies of that collection still match

### Requirement: Profile matches count
Beside the toggle, "N you want" SHALL count the matched collections and open "Matched with your lists", naming each want list behind them.

#### Scenario: Lists behind the count
- **WHEN** the matches come from want lists "binary hunt" and "SSS wants" and the viewer opens the count
- **THEN** the popover names both lists

### Requirement: Profile matches while loading or refused
While the matches load, the toggle SHALL show a spinner and the grid its loading skeleton. A refusal SHALL show its reason beside the toggle, and the grid SHALL stay hidden while the refusal stands, rather than show the collection unnarrowed.

#### Scenario: Loading
- **WHEN** the viewer turns the toggle on and the matches have not arrived
- **THEN** the grid shows its loading skeleton, not the whole collection

#### Scenario: Refused
- **WHEN** the matches request is refused for too many requests
- **THEN** the reason shows beside the toggle and no grid shows

### Requirement: Nothing matches on a profile
When no objekt matches, the page SHALL read "Nothing here matches your lists" with Show all, which turns the toggle off. It SHALL wait until every page of the collection has loaded before saying so.

#### Scenario: Nothing matches
- **WHEN** the viewer turns it on and, with every page loaded, none of the profile's objekts match
- **THEN** the page reads "Nothing here matches your lists" and Show all brings the whole collection back

#### Scenario: Pages still loading
- **WHEN** the first page holds no match and later pages are still loading
- **THEN** the grid shows its loading skeleton until the last page is in

### Requirement: Where profile matches show
The toggle SHALL NOT show on any of the viewer's own profiles, to a signed-out visitor, at a checkpoint (`at=<date>`), or on the Spin address.

#### Scenario: Own profile
- **WHEN** a signed-in user opens a profile at an address linked to their account
- **THEN** the Collection filter bar has no Show my matches toggle

#### Scenario: Checkpoint
- **WHEN** the viewer sets a checkpoint on someone else's profile
- **THEN** the toggle is gone and the grid shows the past state unnarrowed
